#!/usr/bin/env python2.7
'''Returns static files'''
import os
import glob
import json
import datetime
import argparse
import subprocess

from flask import Flask, send_from_directory, make_response, g
app = Flask(__name__)

@app.before_request
def load_history():
    if os.path.exists(app.config['HISTORY_FILE']):
        with open(app.config['HISTORY_FILE'], 'r') as fp:
            g.history = json.load(fp)
    else:
        g.history = {
            'file_stats': {},
            'bookmarks': []
        }

@app.after_request
def save_history(response):
    # with open(app.config['HISTORY_FILE'], 'w') as fp:
    #     json.dump(g.history, fp, indent=2, sort_keys=True)
    return response

@app.route('/')
def index():
    '''return index.html'''
    return send_from_directory('static', 'index.html')

@app.route('/tab')
def get_tabs():
    '''return a json list of tabs'''
    tabs = glob.glob1(app.config['TABPATH'], '*.txt')
    return json.dumps([{'name': x[:-4]} for x in tabs])

@app.route('/tab/<string:filename>')
def get_tab(filename):
    '''return static files'''
    if filename not in g.history['file_stats']:
        g.history['file_stats'][filename] = {
            'load_history': []
        }

    file_stats = g.history['file_stats'][filename]
    access_timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M')
    file_stats['load_history'].append(access_timestamp)

    resp = make_response(send_from_directory(app.config['TABPATH'], filename + '.txt'))
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"

    return resp

@app.route('/bookmarks')
def get_bookmarks():
    '''load bookmarks'''

    resp = make_response(json.dumps(g.history['bookmarks']))
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"

    return resp

@app.route('/tab/<string:filename>/edit', methods=['post'])
def edit_tab(filename):
    '''return static files'''
    result = subprocess.call([app.config['EDITOR'],
        os.path.join(app.config['TABPATH'], filename + '.txt')])
    return json.dumps({'status': result})

def main():
    '''launch AsciiTabJS server'''
    parser = argparse.ArgumentParser(description='Serve Ascii Tabs')
    parser.add_argument('--port', type=int, default=8080,
                        help='port for webserver to listen on')
    parser.add_argument('--debug', action='store_true', default=False,
                        help='run server in debug mode')
    parser.add_argument('--tabpath', default='.',
                        help='path from which to serve tabs')
    parser.add_argument('--editor', default='subl',
                        help='editor to use for editing tabs')
    args = parser.parse_args()

    app.config['TABPATH'] = args.tabpath
    app.config['EDITOR'] = args.editor
    app.config['HISTORY_FILE'] = os.path.join(app.config['TABPATH'], 'asciitab.json')

    app.run(host='0.0.0.0', port=args.port, debug=args.debug)

if __name__ == '__main__':
    main()

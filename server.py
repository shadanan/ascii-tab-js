#!/usr/bin/env python2.7
'''Returns static files'''
import os
import glob
import json
import argparse
import subprocess

from flask import Flask, send_from_directory
app = Flask(__name__)

@app.route('/')
def index():
    '''return index.html'''
    return send_from_directory('static', 'index.html')

@app.route('/tab/')
def list_tabs():
    '''return a json list of tabs'''
    tabs = glob.glob1(app.config['TABPATH'], '*.txt')
    return json.dumps([{'name': x[:-4]} for x in tabs])

@app.route('/tab/<string:filename>/')
def show_tab(filename):
    '''return static files'''
    return send_from_directory(app.config['TABPATH'], filename + '.txt')

@app.route('/tab/<string:filename>/edit')
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

    subprocess.call(['open', 'http://localhost:%d/' % args.port])
    app.run(host='0.0.0.0', port=args.port, debug=args.debug)

if __name__ == '__main__':
    main()

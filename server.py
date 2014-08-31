#!/usr/bin/env python2.7
'''Returns static files'''
import glob
import json
import argparse

from flask import Flask, send_from_directory
app = Flask(__name__)

@app.route('/')
def index():
    '''return index.html'''
    return send_from_directory('static', 'index.html')

@app.route('/tab/')
def tabs():
    '''return a json list of tabs'''
    tab_list = glob.glob1(app.config['TABPATH'], '*.txt')
    return json.dumps([{'name': x[:-4]} for x in tab_list])

@app.route('/tab/<string:filename>/')
def tab(filename):
    '''return static files'''
    return send_from_directory(app.config['TABPATH'], filename + '.txt')

def main():
    '''launch AsciiTabJS server'''
    parser = argparse.ArgumentParser(description='Serve Ascii Tabs')
    parser.add_argument('--port', type=int, default=8080,
                        help='port for webserver to listen on')
    parser.add_argument('--debug', action='store_true', default=False,
                        help='run server in debug mode')
    parser.add_argument('--tabpath', default='.',
                        help='path from which to serve tabs')
    args = parser.parse_args()

    app.config['TABPATH'] = args.tabpath
    app.run(port=args.port, debug=args.debug)

if __name__ == '__main__':
    main()

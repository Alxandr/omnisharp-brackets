/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

define(function (require, exports, module) {
    'use strict';

    var AppInit = brackets.getModule('utils/AppInit'),
        EditorManager = brackets.getModule('editor/EditorManager'),
        CodeMirror = brackets.getModule('thirdparty/CodeMirror2/lib/codemirror'),
        Helpers = require('modules/helpers'),
        Omnisharp = require('modules/omnisharp'),
        DocumentManager = brackets.getModule('document/DocumentManager');
    
    var isRunning,
        currentWidgets = [];

    function getCodeMirror() {
        var editor = EditorManager.getActiveEditor();
        return editor._codeMirror;
    }

    function getLeadingWhitespace(line) {
        var temp = DocumentManager.getCurrentDocument().getLine(line);
        return temp.match(/^[\s]*/)[0];
    }

    function processMember(member) {
        var codeMirror = getCodeMirror(),
            document = DocumentManager.getCurrentDocument(),
            dataToSend = {
                filename: document.file._path,
                line: member.Line,
                column: member.Column + 1
            };
        Omnisharp.makeRequest('findusages', dataToSend, function (err, data) {
            if (err !== null) {
                console.error(err);
            } else {
                currentWidgets.push(codeMirror.addLineWidget(member.Line - 2, $('<pre class="omnisharp-reference-display">' + getLeadingWhitespace(member.Line) + '<i><small><a>' + data.QuickFixes.length + ' references</a></small></i></pre>').get(0), {
                    coverGutter: false,
                    noHScroll: true
                }));
            }
        });
    }

    function clearWidgets(){
        currentWidgets.map(function(widget, idx){
            widget.clear();
        });
        currentWidgets = [];
    }
    
    function load() {
        var document = DocumentManager.getCurrentDocument(),
            dataToSend = {
                filename: document.file._path
            };
        clearWidgets();
        Omnisharp.makeRequest('currentfilemembersasflat', dataToSend, function (err, data) {
            if (err !== null) {
                console.error(err);
            } else {
                data.map(function (member) {
                    return processMember(member);
                });
            }
        });
    }

    function onOmnisharpReady() {
        isRunning = true;
        load();
    }

    function onOmnisharpEnd() {
        isRunning = false;
    }

    function init() {
        $(Omnisharp).on('omnisharpReady', onOmnisharpReady);
        $(Omnisharp).on('omnisharpQuit', onOmnisharpEnd);
        $(Omnisharp).on('omnisharpError', onOmnisharpEnd);

        isRunning = false;
        EditorManager.on("activeEditorChange", function (a,b,c) {
            if (isRunning) {
                load();
            }
        });
    }
    exports.init = init;
});
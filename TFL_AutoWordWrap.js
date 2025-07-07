//=============================================================================
// TFL_AutoWordWrap.js
// ver1.0.2
// Copyright (c) 2025 tasteful-1
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
//=============================================================================
//
// 1.0.2 (25-07-07) : Fixed compatibility issue with MessageAlignCenter plugin.
// 1.0.1 (25-07-06) : Fixed compatibility issue with MessageAlignmentEC plugin.
// 1.0.0 (25-06-19) : Release.
//
//=============================================================================
/*:
 * @target MZ
 * @version 1.0.2
 * @author Tasteful-1
 * @url https://github.com/Tasteful-1
 * @help TFL_AutoWordWrap.js
 *
 * Automatically wraps text at word boundaries when text exceeds screen width.
 * Works with 401 code text display.
 *
 * @plugindesc v1.0.0 Auto Word Wrap
 * @param maxWidth
 * @text Max Width
 * @desc Maximum pixel width before line wrapping (0 = auto)
 * @type number
 * @default 0
 *
 */

/*:ko
 * @target MZ
 * @version 1.0.1
 * @author Tasteful-1
 * @url https://github.com/Tasteful-1
 * @help TFL_AutoWordWrap.js
 *
 * 텍스트가 화면 너비를 초과할 때 단어 경계에서 자동으로 줄바꿈합니다.
 * 401 코드 텍스트 표시에 대응합니다.
 *
 * @plugindesc v1.0.0 자동 단어 줄바꿈
 * @param maxWidth
 * @text 최대 너비
 * @desc 줄바꿈할 최대 픽셀 너비 (0 = 자동)
 * @type number
 * @default 0
 *
 */

(() => {
    'use strict';
    const pluginName = "TFL_AutoWordWrap";
    const parameters = PluginManager.parameters(pluginName);
    const maxWidth = parseInt(parameters['maxWidth']) || 0;

    // Use processAllText instead of convertEscapeCharacters for MessageAlignmentEC compatibility
    const _Window_Message_processAllText = Window_Message.prototype.processAllText;
    Window_Message.prototype.processAllText = function(text) {

        if (text === undefined || text === null) {
            text = '';
        }

        if (typeof text !== 'string') {
            text = String(text);
        }

        let processedText = text;
        if (_Window_Message_processAllText) {
            try {
                processedText = _Window_Message_processAllText.call(this, text);
                if (processedText === undefined || processedText === null) {
                    processedText = text;
                }
                if (typeof processedText !== 'string') {
                    processedText = String(processedText);
                }
            } catch (e) {
                processedText = text;
            }
        }

        // Apply word wrap while preserving alignment control characters
        return this.applyWordWrapWithAlignment(processedText);
    };

    // Apply word wrap while considering alignment control characters
    Window_Message.prototype.applyWordWrapWithAlignment = function(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        const lines = text.split('\n');
        const allWrappedLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.trim() === '') {
                allWrappedLines.push('');
                continue;
            }

            // Extract alignment control characters
            const alignmentMatch = line.match(/\\(LL|CL|RL)/i);
            const alignmentCode = alignmentMatch ? alignmentMatch[0] : '';

            // Get clean text without alignment control characters
            const cleanLine = line.replace(/\\(LL|CL|RL)/i, '');

            if (cleanLine.trim() === '') {
                allWrappedLines.push(line); // Keep line with only alignment characters
            } else {
                const wrapped = this.wrapLineWithAlignment(cleanLine, alignmentCode);

                // Add alignment control character only to the first line
                if (wrapped.length > 0 && alignmentCode) {
                    wrapped[0] = alignmentCode + wrapped[0];
                }

                allWrappedLines.push(...wrapped);
            }
        }

        return allWrappedLines.join('\n');
    };

    // Calculate actual text area width (considering face graphics)
    Window_Message.prototype.getTextAreaWidth = function() {
        if (maxWidth > 0) {
            return maxWidth;
        }

        const padding = this.textPadding ? this.textPadding() : 18;
        let baseWidth = this.contents.width - padding * 2;

        // Reduce text area when face graphic is present
        if ($gameMessage.faceName()) {
            const faceWidth = Window_Base._faceWidth || 144;
            const faceMargin = 20;
            baseWidth -= (faceWidth + faceMargin);
        }

        const usableWidth = Math.floor(baseWidth * 0.95);
        return Math.max(usableWidth, 200);
    };

    // Wrap a single line while considering alignment
    Window_Message.prototype.wrapLineWithAlignment = function(line, alignmentCode) {
        if (!line || line.trim() === '') return [''];

        const availableWidth = this.getTextAreaWidth();
        const words = line.split(' ');
        const wrappedLines = [];
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (!word) continue;

            const testLine = currentLine ? currentLine + ' ' + word : word;

            let testWidth;
            try {
                // Use MessageAlignmentEC's textWidthEx method if available
                if (this.textWidthEx) {
                    testWidth = this.textWidthEx(testLine);
                } else {
                    testWidth = this.textWidth(testLine);
                }
            } catch (e) {
                testWidth = testLine.length * 24;
            }

            if (testWidth <= availableWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    wrappedLines.push(currentLine);
                    currentLine = word;
                } else {
                    wrappedLines.push(word);
                    currentLine = '';
                }
            }
        }

        if (currentLine) {
            wrappedLines.push(currentLine);
        }

        return wrappedLines.length > 0 ? wrappedLines : [''];
    };

})();
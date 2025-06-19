//=============================================================================
// TFL_AutoWordWrap.js
// ver1.0.0
// Copyright (c) 2025 tasteful-1
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
//=============================================================================

/*:
 * @version 1.0.0
 * @author Tasteful-1
 * @url https://github.com/Tasteful-1
 * @help TFL_AutoWordWrap.js
 *
 * @plugindesc v1.0.0 Auto Word Wrap
 *
 * Automatically wraps text at word boundaries when text exceeds screen width.
 * Works with 401 code text display.
 *
 * @param maxWidth
 * @text Max Width
 * @desc Maximum pixel width before line wrapping (0 = auto)
 * @type number
 * @default 0
 *
 */

/*:ja
 * @version 1.0.0
 * @author Tasteful-1
 * @url https://github.com/Tasteful-1
 * @help TFL_AutoWordWrap.js
 *
 * @plugindesc v1.0.0 自動単語折り返し
 *
 * テキストが画面幅を超えた時に単語境界で自動的に折り返します。
 * 401コードのテキスト表示に対応しています。
 *
 * @param maxWidth
 * @text 最大幅
 * @desc 改行する最大ピクセル幅 (0 = 自動)
 * @type number
 * @default 0
 *
 */

/*:ko
 * @version 1.0.0
 * @author Tasteful-1
 * @url https://github.com/Tasteful-1
 * @help TFL_AutoWordWrap.js
 *
 * @plugindesc v1.0.0 자동 단어 줄바꿈
 *
 * 텍스트가 화면 너비를 초과할 때 단어 경계에서 자동으로 줄바꿈합니다.
 * 401 코드 텍스트 표시에 대응합니다.
 *
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

    // Override convertEscapeCharacters to apply word wrapping
    const _Window_Message_convertEscapeCharacters = Window_Message.prototype.convertEscapeCharacters;
    Window_Message.prototype.convertEscapeCharacters = function(text) {
        text = _Window_Message_convertEscapeCharacters.call(this, text);
        return this.applyWordWrap(text);
    };

    // Apply word wrapping to text
    Window_Message.prototype.applyWordWrap = function(text) {
        const lines = text.split('\n');
        const allWrappedLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.trim() === '') {
                allWrappedLines.push('');
            } else {
                const wrapped = this.wrapLine(line);

                // Merge wrapped text with next line when auto-wrapping occurs
                if (wrapped.length > 1 && i + 1 < lines.length) {
                    // Combine last wrapped part with next line
                    const lastWrapped = wrapped.pop();
                    const nextLine = lines[i + 1];

                    // Add existing wrapped lines
                    allWrappedLines.push(...wrapped);

                    // Combine last part with next line
                    const combinedLine = lastWrapped + (nextLine ? ' ' + nextLine : '');
                    const reWrapped = this.wrapLine(combinedLine);
                    allWrappedLines.push(...reWrapped);

                    // Skip next line since it's already processed
                    i++;
                } else {
                    allWrappedLines.push(...wrapped);
                }
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

    // Wrap a single line at word boundaries
    Window_Message.prototype.wrapLine = function(line) {
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
                testWidth = this.textWidth(testLine);
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
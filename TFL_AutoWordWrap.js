//=============================================================================
// TFL_AutoWordWrap.js
// ver1.0.3
// Copyright (c) 2025 tasteful-1
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
//=============================================================================
//
// 1.0.3 (25-08-03) : Simplified code structure.
// 1.0.2 (25-07-07) : Fixed compatibility issue with MessageAlignCenter plugin.
// 1.0.1 (25-07-06) : Fixed compatibility issue with MessageAlignmentEC plugin.
// 1.0.0 (25-06-19) : Release.
//
//=============================================================================
/*:
 * @target MZ
 * @version 1.0.3
 * @author Tasteful-1
 * @url https://github.com/Tasteful-1
 * @help TFL_AutoWordWrap.js
 *
 * Automatically wraps text at word boundaries when text exceeds screen width.
 * Works with 401 code text display.
 *
 * @plugindesc v1.0.3 Auto Word Wrap
 * @param maxWidth
 * @text Max Width
 * @desc Maximum pixel width before line wrapping (0 = auto)
 * @type number
 * @default 0
 *
 */

/*:ko
 * @target MZ
 * @version 1.0.3
 * @author Tasteful-1
 * @url https://github.com/Tasteful-1
 * @help TFL_AutoWordWrap.js
 *
 * 텍스트가 화면 너비를 초과할 때 단어 경계에서 자동으로 줄바꿈합니다.
 * 401 코드 텍스트 표시에 대응합니다.
 *
 * @plugindesc v1.0.3 자동 단어 줄바꿈
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

    // Override convertEscapeCharacters instead of processAllText for better compatibility
    const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
    Window_Base.prototype.convertEscapeCharacters = function(text) {
        const convertedText = _Window_Base_convertEscapeCharacters.call(this, text);
        
        // Only apply word wrap to message windows
        if (this instanceof Window_Message) {
            return this.applyWordWrap(convertedText);
        }
        
        return convertedText;
    };

    // Simple word wrap function
    Window_Message.prototype.applyWordWrap = function(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        const lines = text.split('\n');
        const wrappedLines = [];

        for (const line of lines) {
            if (line.trim() === '') {
                wrappedLines.push('');
                continue;
            }

            const wrapped = this.wrapSingleLine(line);
            wrappedLines.push(...wrapped);
        }

        return wrappedLines.join('\n');
    };

    // Wrap a single line
    Window_Message.prototype.wrapSingleLine = function(line) {
        const availableWidth = this.getTextAreaWidth();
        const words = line.split(' ');
        const wrappedLines = [];
        let currentLine = '';

        for (const word of words) {
            if (!word) continue;

            const testLine = currentLine ? currentLine + ' ' + word : word;
            const testWidth = this.getTextWidth(testLine);

            if (testWidth <= availableWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    wrappedLines.push(currentLine);
                    currentLine = word;
                } else {
                    wrappedLines.push(word);
                }
            }
        }

        if (currentLine) {
            wrappedLines.push(currentLine);
        }

        return wrappedLines.length > 0 ? wrappedLines : [''];
    };

    // Safe text width calculation with MessageAlignmentEC compatibility
    Window_Message.prototype.getTextWidth = function(text) {
        try {
            // Use MessageAlignmentEC's textWidthEx method if available for better compatibility
            if (this.textWidthEx && typeof this.textWidthEx === 'function') {
                return this.textWidthEx(text);
            } else if (this.textWidth) {
                return this.textWidth(text);
            }
        } catch (e) {
            // Fallback calculation
        }
        return text.length * 20;
    };

    // Calculate actual text area width (considering face graphics)
    Window_Message.prototype.getTextAreaWidth = function() {
        if (maxWidth > 0) {
            return maxWidth;
        }

        // Simple width calculation
        let baseWidth = 600; // Default message window width
        
        if (this.contents) {
            baseWidth = this.contents.width - 36; // 18px padding on each side
        }

        // Reduce text area when face graphic is present
        if ($gameMessage.faceName()) {
            baseWidth -= 164; // 144px face + 20px margin
        }

        return Math.max(baseWidth * 0.95, 200);
    };

})();
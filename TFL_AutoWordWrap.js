//=============================================================================
// TFL_AutoWordWrap.js
// ver1.0.4
// Copyright (c) 2025 tasteful-1
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
//=============================================================================
//
// 1.0.4 (25-08-13) : Added advanced wrapping options.
// 1.0.3 (25-08-13) : Simplified code structure and removed alignment processing logic.
// 1.0.2 (25-07-07) : Fixed compatibility issue with MessageAlignCenter plugin.
// 1.0.1 (25-07-06) : Fixed compatibility issue with MessageAlignmentEC plugin.
// 1.0.0 (25-06-19) : Release.
//
//=============================================================================
/*:
 * @target MZ
 * @version 1.0.4
 * @author Tasteful-1
 * @url https://github.com/Tasteful-1
 * @help TFL_AutoWordWrap.js
 *
 * Automatically wraps text at word boundaries when text exceeds screen width.
 * Works with 401 code text display.
 *
 * @plugindesc v1.0.4 Auto Word Wrap
 * @param maxWidth
 * @text Max Width
 * @desc Maximum pixel width before line wrapping (0 = auto)
 * @type number
 * @default 0
 *
 * @param mergeWithNextLine
 * @text Merge with Next Line
 * @desc Merge wrapped text with existing next line content
 * @type boolean
 * @default false
 *
 * @param chainWrapping
 * @text Chain Wrapping
 * @desc Continue wrapping when merged line also exceeds width
 * @type boolean
 * @default false
 *
 * @param preserveEmptyLines
 * @text Preserve Empty Lines
 * @desc Keep intentional empty lines in text
 * @type boolean
 * @default true
 */

/*:ko
 * @target MZ
 * @version 1.0.4
 * @author Tasteful-1
 * @url https://github.com/Tasteful-1
 * @help TFL_AutoWordWrap.js
 *
 * 텍스트가 화면 너비를 초과할 때 단어 경계에서 자동으로 줄바꿈합니다.
 * 401 코드 텍스트 표시에 대응합니다.
 *
 * @plugindesc v1.0.4 자동 단어 줄바꿈
 * @param maxWidth
 * @text 최대 너비
 * @desc 줄바꿈할 최대 픽셀 너비 (0 = 자동)
 * @type number
 * @default 0
 *
 * @param mergeWithNextLine
 * @text 다음 줄과 병합
 * @desc 줄바꿈된 텍스트를 다음 줄 내용과 병합
 * @type boolean
 * @default false
 *
 * @param chainWrapping
 * @text 연쇄 줄바꿈
 * @desc 병합된 줄이 또 넘칠 때 계속 줄바꿈 처리
 * @type boolean
 * @default false
 *
 * @param preserveEmptyLines
 * @text 빈 줄 보존
 * @desc 의도적인 빈 줄을 유지
 * @type boolean
 * @default true
 */

(() => {
    'use strict';
    const pluginName = "TFL_AutoWordWrap";
    const parameters = PluginManager.parameters(pluginName);
    const maxWidth = parseInt(parameters['maxWidth']) || 0;
    const mergeWithNextLine = parameters['mergeWithNextLine'] === 'true';
    const chainWrapping = parameters['chainWrapping'] === 'true';
    const preserveEmptyLines = parameters['preserveEmptyLines'] === 'true';

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

    // Sequential overflow merging approach
    Window_Message.prototype.applyWordWrap = function(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        let lines = text.split('\n');
        
        // Remove empty lines if preserveEmptyLines is false
        if (!preserveEmptyLines) {
            lines = lines.filter(line => line.trim() !== '');
        }

        const wrappedLines = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            console.log(`[AutoWordWrap] 처리 중 라인 ${i}:`, line);

            if (line.trim() === '') {
                wrappedLines.push('');
                i++;
                continue;
            }

            if (mergeWithNextLine) {
                // Process with sequential overflow merging
                const result = this.processSequentialMerging(lines, i);
                wrappedLines.push(...result.processedLines);
                i = result.nextIndex;
            } else {
                // Normal wrapping without merging
                const wrapped = this.wrapSingleLine(line);
                wrappedLines.push(...wrapped);
                i++;
            }
        }

        console.log(`[AutoWordWrap] 최종 결과:`, wrappedLines);
        return wrappedLines.join('\n');
    };

    // Sequential overflow merging processor
    Window_Message.prototype.processSequentialMerging = function(lines, startIndex) {
        const processedLines = [];
        const availableWidth = this.getTextAreaWidth();
        let currentIndex = startIndex;
        let currentLine = lines[currentIndex];
        
        console.log(`[AutoWordWrap] 순차 병합 시작 - 인덱스 ${currentIndex}: "${currentLine}"`);

        while (currentIndex < lines.length) {
            const currentWidth = this.getTextWidth(currentLine);
            console.log(`[AutoWordWrap] 현재 라인 너비 검사: "${currentLine}" (${currentWidth} / ${availableWidth})`);

            if (currentWidth <= availableWidth) {
                // Current line fits, add it and move to next
                console.log(`[AutoWordWrap] 라인이 너비에 맞음, 추가`);
                processedLines.push(currentLine);
                currentIndex++;
                
                if (currentIndex < lines.length) {
                    currentLine = lines[currentIndex];
                    console.log(`[AutoWordWrap] 다음 라인으로 이동: "${currentLine}"`);
                }
            } else {
                // Current line exceeds width, need to split
                console.log(`[AutoWordWrap] 라인이 너비 초과, 분할 필요`);
                
                if (!chainWrapping) {
                    // Chain wrapping disabled, just wrap the line normally
                    const wrapped = this.wrapSingleLine(currentLine);
                    processedLines.push(...wrapped);
                    currentIndex++;
                    if (currentIndex < lines.length) {
                        currentLine = lines[currentIndex];
                    }
                    continue;
                }

                // Find where to split the line
                const splitResult = this.findOptimalSplit(currentLine, availableWidth);
                console.log(`[AutoWordWrap] 분할 결과:`, splitResult);

                if (splitResult.fittingPart) {
                    processedLines.push(splitResult.fittingPart);
                }

                if (splitResult.overflow) {
                    // Check next line BEFORE merging
                    if (currentIndex + 1 < lines.length) {
                        const nextLine = lines[currentIndex + 1];

                        if (nextLine.trim() === '') {
                            // Can't merge with next line, add overflow as separate line
                            console.log(`[AutoWordWrap] 병합 불가, 오버플로우를 별도 라인으로 추가`);
                            const overflowWrapped = this.wrapSingleLine(splitResult.overflow);
                            processedLines.push(...overflowWrapped);
                            currentIndex++;
                            currentLine = nextLine;
                        } else {
                            // Safe to merge overflow with next line
                            currentLine = splitResult.overflow + ' ' + nextLine;
                            console.log(`[AutoWordWrap] 안전하게 병합: "${currentLine}"`);
                            currentIndex++; // Skip the next line since we merged it
                            // Continue loop to check merged line
                        }
                    } else {
                        // No next line, add overflow as final line
                        console.log(`[AutoWordWrap] 마지막 라인, 오버플로우를 별도 라인으로 추가`);
                        const overflowWrapped = this.wrapSingleLine(splitResult.overflow);
                        processedLines.push(...overflowWrapped);
                        break;
                    }
                } else {
                    // No overflow, move to next line
                    currentIndex++;
                    if (currentIndex < lines.length) {
                        currentLine = lines[currentIndex];
                    }
                }
            }
        }

        return {
            processedLines: processedLines,
            nextIndex: currentIndex + 1
        };
    };

    // Find optimal split point for a line that exceeds width
    Window_Message.prototype.findOptimalSplit = function(line, availableWidth) {
        const words = line.split(' ');
        let fittingPart = '';
        let overflow = '';

        for (let i = 0; i < words.length; i++) {
            const testLine = fittingPart ? fittingPart + ' ' + words[i] : words[i];
            const testWidth = this.getTextWidth(testLine);

            if (testWidth <= availableWidth) {
                fittingPart = testLine;
            } else {
                // This word makes it exceed, put it in overflow
                overflow = words.slice(i).join(' ');
                break;
            }
        }

        // If no words fit at all, put first word in fitting part
        if (!fittingPart && words.length > 0) {
            fittingPart = words[0];
            overflow = words.slice(1).join(' ');
        }

        return {
            fittingPart: fittingPart,
            overflow: overflow
        };
    };

    // Simple word-based line wrapping
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
                    // Single word is too long, just add it anyway
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


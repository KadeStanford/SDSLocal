import { a as __toESM, t as __commonJSMin } from "./rolldown-runtime-7_rZTKki.js";
import { t as require_react } from "./react.js";
import { PixelRatio, Platform, StyleSheet, Touchable, unstable_createElement } from "F:/BusinessApp/.codex-tmp/parish-pass-dark-review/review/runner/text-scale-native.tsx";
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/utils/fetchData.ts
var import_react = /* @__PURE__ */ __toESM(require_react());
async function fetchText(uri) {
	if (!uri) return null;
	if (uri.startsWith("data:image/svg+xml;utf8") && Platform.OS === "android") return dataUriToXml(uri);
	else if (uri.startsWith("data:image/svg+xml;base64")) return decodeBase64Image(uri);
	else return fetchUriData(uri);
}
var decodeBase64Image = (uri) => {
	const content = decodeURIComponent(uri).split(";")[1].split(",").slice(1).join(",");
	return atob(content);
};
function dataUriToXml(uri) {
	try {
		return decodeURIComponent(uri).split(",").slice(1).join(",");
	} catch (error) {
		throw new Error(`Decoding ${uri} failed with error: ${error}`);
	}
}
async function fetchUriData(uri) {
	const response = await fetch(uri);
	if (response.ok || response.status === 0 && uri.startsWith("file://")) return await response.text();
	throw new Error(`Fetching ${uri} failed with status ${response.status}`);
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/web/utils/index.ts
var camelCaseToDashed = (camelCase) => {
	return camelCase.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
};
var getBoundingClientRect = (node) => {
	if (node) {
		if (node.nodeType === 1 && typeof node.getBoundingClientRect === "function") return node.getBoundingClientRect();
	}
	throw new Error("Can not get boundingClientRect of " + node || "undefined");
};
var measureLayout = (node, callback) => {
	const relativeNode = node?.parentNode;
	if (relativeNode) setTimeout(() => {
		const relativeRect = getBoundingClientRect(relativeNode);
		const { height, left, top, width } = getBoundingClientRect(node);
		callback(left - relativeRect.left, top - relativeRect.top, width, height, left, top);
	}, 0);
};
function remeasure() {
	const tag = this.state.touchable.responderID;
	if (tag === null) return;
	measureLayout(tag, this._handleQueryLayout);
}
function encodeSvg(svgString) {
	return svgString.replace("<svg", ~svgString.indexOf("xmlns") ? "<svg" : "<svg xmlns=\"http://www.w3.org/2000/svg\"").replace(/"/g, "'").replace(/%/g, "%25").replace(/#/g, "%23").replace(/{/g, "%7B").replace(/}/g, "%7D").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/\s+/g, " ");
}
var KEEP_CAMEL_CASE = /* @__PURE__ */ new Set([
	"stdDeviation",
	"edgeMode",
	"kernelMatrix",
	"kernelUnitLength",
	"preserveAlpha",
	"baseFrequency",
	"targetX",
	"targetY",
	"numOctaves",
	"stitchTiles",
	"filterUnits",
	"primitiveUnits",
	"pathLength",
	"gradientUnits",
	"gradientTransform",
	"spreadMethod",
	"markerHeight",
	"markerUnits",
	"markerWidth",
	"viewBox",
	"refX",
	"refY",
	"maskContentUnits",
	"maskUnits",
	"patternContentUnits",
	"patternTransform",
	"patternUnits",
	"textLength",
	"lengthAdjust",
	"startOffset",
	"clipPathUnits"
]);
var getAttributeName = (attr) => {
	return KEEP_CAMEL_CASE.has(attr) ? attr : camelCaseToDashed(attr);
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/web/utils/hasProperty.ts
function hasTouchableProperty(props) {
	return !!(props.onPress || props.onPressIn || props.onPressOut || props.onLongPress);
}
Math.PI / 180;
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/lib/extract/transform.js
var require_transform = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function peg$subclass(child, parent) {
		function ctor() {
			this.constructor = child;
		}
		ctor.prototype = parent.prototype;
		child.prototype = new ctor();
	}
	function peg$SyntaxError(message, expected, found, location) {
		this.message = message;
		this.expected = expected;
		this.found = found;
		this.location = location;
		this.name = "SyntaxError";
		if (typeof Error.captureStackTrace === "function") Error.captureStackTrace(this, peg$SyntaxError);
	}
	peg$subclass(peg$SyntaxError, Error);
	peg$SyntaxError.buildMessage = function(expected, found) {
		var DESCRIBE_EXPECTATION_FNS = {
			literal: function(expectation) {
				return "\"" + literalEscape(expectation.text) + "\"";
			},
			"class": function(expectation) {
				var escapedParts = "", i = 0;
				for (; i < expectation.parts.length; i++) escapedParts += expectation.parts[i] instanceof Array ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1]) : classEscape(expectation.parts[i]);
				return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
			},
			any: function(expectation) {
				return "any character";
			},
			end: function(expectation) {
				return "end of input";
			},
			other: function(expectation) {
				return expectation.description;
			}
		};
		function hex(ch) {
			return ch.charCodeAt(0).toString(16).toUpperCase();
		}
		function literalEscape(s) {
			return s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
				return "\\x0" + hex(ch);
			}).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
				return "\\x" + hex(ch);
			});
		}
		function classEscape(s) {
			return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
				return "\\x0" + hex(ch);
			}).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
				return "\\x" + hex(ch);
			});
		}
		function describeExpectation(expectation) {
			return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
		}
		function describeExpected(expected) {
			var descriptions = new Array(expected.length), i = 0, j;
			for (; i < expected.length; i++) descriptions[i] = describeExpectation(expected[i]);
			descriptions.sort();
			if (descriptions.length > 0) {
				for (i = 1, j = 1; i < descriptions.length; i++) if (descriptions[i - 1] !== descriptions[i]) {
					descriptions[j] = descriptions[i];
					j++;
				}
				descriptions.length = j;
			}
			switch (descriptions.length) {
				case 1: return descriptions[0];
				case 2: return descriptions[0] + " or " + descriptions[1];
				default: return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
			}
		}
		function describeFound(found) {
			return found ? "\"" + literalEscape(found) + "\"" : "end of input";
		}
		return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
	};
	function peg$parse(input, options) {
		options = options !== void 0 ? options : {};
		var peg$FAILED = {}, peg$startRuleFunctions = { transformList: peg$parsetransformList }, peg$startRuleFunction = peg$parsetransformList, peg$c0 = function(ts) {
			return ts;
		}, peg$c1 = function(t, ts) {
			return multiply_matrices(t, ts);
		}, peg$c2 = "matrix", peg$c3 = peg$literalExpectation("matrix", false), peg$c4 = "(", peg$c5 = peg$literalExpectation("(", false), peg$c6 = ")", peg$c7 = peg$literalExpectation(")", false), peg$c8 = function(a, b, c, d, e, f) {
			return [
				a,
				c,
				e,
				b,
				d,
				f
			];
		}, peg$c9 = "translate", peg$c10 = peg$literalExpectation("translate", false), peg$c11 = function(tx, ty) {
			return [
				1,
				0,
				tx,
				0,
				1,
				ty || 0
			];
		}, peg$c12 = "scale", peg$c13 = peg$literalExpectation("scale", false), peg$c14 = function(sx, sy) {
			return [
				sx,
				0,
				0,
				0,
				sy === null ? sx : sy,
				0
			];
		}, peg$c15 = "rotate", peg$c16 = peg$literalExpectation("rotate", false), peg$c17 = function(angle, c) {
			var cos = Math.cos(deg2rad * angle);
			var sin = Math.sin(deg2rad * angle);
			if (c !== null) {
				var x = c[0];
				var y = c[1];
				return [
					cos,
					-sin,
					cos * -x + -sin * -y + x,
					sin,
					cos,
					sin * -x + cos * -y + y
				];
			}
			return [
				cos,
				-sin,
				0,
				sin,
				cos,
				0
			];
		}, peg$c18 = "skewX", peg$c19 = peg$literalExpectation("skewX", false), peg$c20 = function(angle) {
			return [
				1,
				Math.tan(deg2rad * angle),
				0,
				0,
				1,
				0
			];
		}, peg$c21 = "skewY", peg$c22 = peg$literalExpectation("skewY", false), peg$c23 = function(angle) {
			return [
				1,
				0,
				0,
				Math.tan(deg2rad * angle),
				1,
				0
			];
		}, peg$c24 = function(f) {
			return parseFloat(f.join(""));
		}, peg$c25 = function(i) {
			return parseInt(i.join(""));
		}, peg$c26 = function(n) {
			return n;
		}, peg$c27 = function(n1, n2) {
			return [n1, n2];
		}, peg$c28 = ",", peg$c29 = peg$literalExpectation(",", false), peg$c30 = function(ds) {
			return ds.join("");
		}, peg$c31 = function(f) {
			return f.join("");
		}, peg$c32 = function(d) {
			return d.join("");
		}, peg$c33 = peg$otherExpectation("fractionalConstant"), peg$c34 = ".", peg$c35 = peg$literalExpectation(".", false), peg$c36 = function(d1, d2) {
			return [
				d1 ? d1.join("") : null,
				".",
				d2.join("")
			].join("");
		}, peg$c37 = /^[eE]/, peg$c38 = peg$classExpectation(["e", "E"], false, false), peg$c39 = function(e) {
			return [
				e[0],
				e[1],
				e[2].join("")
			].join("");
		}, peg$c40 = /^[+\-]/, peg$c41 = peg$classExpectation(["+", "-"], false, false), peg$c42 = /^[0-9]/, peg$c43 = peg$classExpectation([["0", "9"]], false, false), peg$c44 = /^[ \t\r\n]/, peg$c45 = peg$classExpectation([
			" ",
			"	",
			"\r",
			"\n"
		], false, false), peg$currPos = 0, peg$posDetailsCache = [{
			line: 1,
			column: 1
		}], peg$maxFailPos = 0, peg$maxFailExpected = [], peg$silentFails = 0, peg$result;
		if ("startRule" in options) {
			if (!(options.startRule in peg$startRuleFunctions)) throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
			peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
		}
		function peg$literalExpectation(text, ignoreCase) {
			return {
				type: "literal",
				text,
				ignoreCase
			};
		}
		function peg$classExpectation(parts, inverted, ignoreCase) {
			return {
				type: "class",
				parts,
				inverted,
				ignoreCase
			};
		}
		function peg$endExpectation() {
			return { type: "end" };
		}
		function peg$otherExpectation(description) {
			return {
				type: "other",
				description
			};
		}
		function peg$computePosDetails(pos) {
			var details = peg$posDetailsCache[pos], p;
			if (details) return details;
			else {
				p = pos - 1;
				while (!peg$posDetailsCache[p]) p--;
				details = peg$posDetailsCache[p];
				details = {
					line: details.line,
					column: details.column
				};
				while (p < pos) {
					if (input.charCodeAt(p) === 10) {
						details.line++;
						details.column = 1;
					} else details.column++;
					p++;
				}
				peg$posDetailsCache[pos] = details;
				return details;
			}
		}
		function peg$computeLocation(startPos, endPos) {
			var startPosDetails = peg$computePosDetails(startPos), endPosDetails = peg$computePosDetails(endPos);
			return {
				start: {
					offset: startPos,
					line: startPosDetails.line,
					column: startPosDetails.column
				},
				end: {
					offset: endPos,
					line: endPosDetails.line,
					column: endPosDetails.column
				}
			};
		}
		function peg$fail(expected) {
			if (peg$currPos < peg$maxFailPos) return;
			if (peg$currPos > peg$maxFailPos) {
				peg$maxFailPos = peg$currPos;
				peg$maxFailExpected = [];
			}
			peg$maxFailExpected.push(expected);
		}
		function peg$buildStructuredError(expected, found, location) {
			return new peg$SyntaxError(peg$SyntaxError.buildMessage(expected, found), expected, found, location);
		}
		function peg$parsetransformList() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parsewsp(), s3, s4;
			while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parsewsp();
			}
			if (s1 !== peg$FAILED) {
				s2 = peg$parsetransforms();
				if (s2 === peg$FAILED) s2 = null;
				if (s2 !== peg$FAILED) {
					s3 = [];
					s4 = peg$parsewsp();
					while (s4 !== peg$FAILED) {
						s3.push(s4);
						s4 = peg$parsewsp();
					}
					if (s3 !== peg$FAILED) {
						s1 = peg$c0(s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parsetransforms() {
			var s0 = peg$currPos, s1 = peg$parsetransform(), s2, s3;
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$parsecommaWsp();
				while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$parsecommaWsp();
				}
				if (s2 !== peg$FAILED) {
					s3 = peg$parsetransforms();
					if (s3 !== peg$FAILED) {
						s1 = peg$c1(s1, s3);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			if (s0 === peg$FAILED) s0 = peg$parsetransform();
			return s0;
		}
		function peg$parsetransform() {
			var s0 = peg$parsematrix();
			if (s0 === peg$FAILED) {
				s0 = peg$parsetranslate();
				if (s0 === peg$FAILED) {
					s0 = peg$parsescale();
					if (s0 === peg$FAILED) {
						s0 = peg$parserotate();
						if (s0 === peg$FAILED) {
							s0 = peg$parseskewX();
							if (s0 === peg$FAILED) s0 = peg$parseskewY();
						}
					}
				}
			}
			return s0;
		}
		function peg$parsematrix() {
			var s0 = peg$currPos, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17;
			if (input.substr(peg$currPos, 6) === peg$c2) {
				s1 = peg$c2;
				peg$currPos += 6;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c3);
			}
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$parsewsp();
				while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$parsewsp();
				}
				if (s2 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 40) {
						s3 = peg$c4;
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c5);
					}
					if (s3 !== peg$FAILED) {
						s4 = [];
						s5 = peg$parsewsp();
						while (s5 !== peg$FAILED) {
							s4.push(s5);
							s5 = peg$parsewsp();
						}
						if (s4 !== peg$FAILED) {
							s5 = peg$parsenumber();
							if (s5 !== peg$FAILED) {
								s6 = peg$parsecommaWsp();
								if (s6 !== peg$FAILED) {
									s7 = peg$parsenumber();
									if (s7 !== peg$FAILED) {
										s8 = peg$parsecommaWsp();
										if (s8 !== peg$FAILED) {
											s9 = peg$parsenumber();
											if (s9 !== peg$FAILED) {
												s10 = peg$parsecommaWsp();
												if (s10 !== peg$FAILED) {
													s11 = peg$parsenumber();
													if (s11 !== peg$FAILED) {
														s12 = peg$parsecommaWsp();
														if (s12 !== peg$FAILED) {
															s13 = peg$parsenumber();
															if (s13 !== peg$FAILED) {
																s14 = peg$parsecommaWsp();
																if (s14 !== peg$FAILED) {
																	s15 = peg$parsenumber();
																	if (s15 !== peg$FAILED) {
																		s16 = [];
																		s17 = peg$parsewsp();
																		while (s17 !== peg$FAILED) {
																			s16.push(s17);
																			s17 = peg$parsewsp();
																		}
																		if (s16 !== peg$FAILED) {
																			if (input.charCodeAt(peg$currPos) === 41) {
																				s17 = peg$c6;
																				peg$currPos++;
																			} else {
																				s17 = peg$FAILED;
																				if (peg$silentFails === 0) peg$fail(peg$c7);
																			}
																			if (s17 !== peg$FAILED) {
																				s1 = peg$c8(s5, s7, s9, s11, s13, s15);
																				s0 = s1;
																			} else {
																				peg$currPos = s0;
																				s0 = peg$FAILED;
																			}
																		} else {
																			peg$currPos = s0;
																			s0 = peg$FAILED;
																		}
																	} else {
																		peg$currPos = s0;
																		s0 = peg$FAILED;
																	}
																} else {
																	peg$currPos = s0;
																	s0 = peg$FAILED;
																}
															} else {
																peg$currPos = s0;
																s0 = peg$FAILED;
															}
														} else {
															peg$currPos = s0;
															s0 = peg$FAILED;
														}
													} else {
														peg$currPos = s0;
														s0 = peg$FAILED;
													}
												} else {
													peg$currPos = s0;
													s0 = peg$FAILED;
												}
											} else {
												peg$currPos = s0;
												s0 = peg$FAILED;
											}
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parsetranslate() {
			var s0 = peg$currPos, s1, s2, s3, s4, s5, s6, s7, s8;
			if (input.substr(peg$currPos, 9) === peg$c9) {
				s1 = peg$c9;
				peg$currPos += 9;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c10);
			}
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$parsewsp();
				while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$parsewsp();
				}
				if (s2 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 40) {
						s3 = peg$c4;
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c5);
					}
					if (s3 !== peg$FAILED) {
						s4 = [];
						s5 = peg$parsewsp();
						while (s5 !== peg$FAILED) {
							s4.push(s5);
							s5 = peg$parsewsp();
						}
						if (s4 !== peg$FAILED) {
							s5 = peg$parsenumber();
							if (s5 !== peg$FAILED) {
								s6 = peg$parsecommaWspNumber();
								if (s6 === peg$FAILED) s6 = null;
								if (s6 !== peg$FAILED) {
									s7 = [];
									s8 = peg$parsewsp();
									while (s8 !== peg$FAILED) {
										s7.push(s8);
										s8 = peg$parsewsp();
									}
									if (s7 !== peg$FAILED) {
										if (input.charCodeAt(peg$currPos) === 41) {
											s8 = peg$c6;
											peg$currPos++;
										} else {
											s8 = peg$FAILED;
											if (peg$silentFails === 0) peg$fail(peg$c7);
										}
										if (s8 !== peg$FAILED) {
											s1 = peg$c11(s5, s6);
											s0 = s1;
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parsescale() {
			var s0 = peg$currPos, s1, s2, s3, s4, s5, s6, s7, s8;
			if (input.substr(peg$currPos, 5) === peg$c12) {
				s1 = peg$c12;
				peg$currPos += 5;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c13);
			}
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$parsewsp();
				while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$parsewsp();
				}
				if (s2 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 40) {
						s3 = peg$c4;
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c5);
					}
					if (s3 !== peg$FAILED) {
						s4 = [];
						s5 = peg$parsewsp();
						while (s5 !== peg$FAILED) {
							s4.push(s5);
							s5 = peg$parsewsp();
						}
						if (s4 !== peg$FAILED) {
							s5 = peg$parsenumber();
							if (s5 !== peg$FAILED) {
								s6 = peg$parsecommaWspNumber();
								if (s6 === peg$FAILED) s6 = null;
								if (s6 !== peg$FAILED) {
									s7 = [];
									s8 = peg$parsewsp();
									while (s8 !== peg$FAILED) {
										s7.push(s8);
										s8 = peg$parsewsp();
									}
									if (s7 !== peg$FAILED) {
										if (input.charCodeAt(peg$currPos) === 41) {
											s8 = peg$c6;
											peg$currPos++;
										} else {
											s8 = peg$FAILED;
											if (peg$silentFails === 0) peg$fail(peg$c7);
										}
										if (s8 !== peg$FAILED) {
											s1 = peg$c14(s5, s6);
											s0 = s1;
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parserotate() {
			var s0 = peg$currPos, s1, s2, s3, s4, s5, s6, s7, s8;
			if (input.substr(peg$currPos, 6) === peg$c15) {
				s1 = peg$c15;
				peg$currPos += 6;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c16);
			}
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$parsewsp();
				while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$parsewsp();
				}
				if (s2 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 40) {
						s3 = peg$c4;
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c5);
					}
					if (s3 !== peg$FAILED) {
						s4 = [];
						s5 = peg$parsewsp();
						while (s5 !== peg$FAILED) {
							s4.push(s5);
							s5 = peg$parsewsp();
						}
						if (s4 !== peg$FAILED) {
							s5 = peg$parsenumber();
							if (s5 !== peg$FAILED) {
								s6 = peg$parsecommaWspTwoNumbers();
								if (s6 === peg$FAILED) s6 = null;
								if (s6 !== peg$FAILED) {
									s7 = [];
									s8 = peg$parsewsp();
									while (s8 !== peg$FAILED) {
										s7.push(s8);
										s8 = peg$parsewsp();
									}
									if (s7 !== peg$FAILED) {
										if (input.charCodeAt(peg$currPos) === 41) {
											s8 = peg$c6;
											peg$currPos++;
										} else {
											s8 = peg$FAILED;
											if (peg$silentFails === 0) peg$fail(peg$c7);
										}
										if (s8 !== peg$FAILED) {
											s1 = peg$c17(s5, s6);
											s0 = s1;
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseskewX() {
			var s0 = peg$currPos, s1, s2, s3, s4, s5, s6, s7;
			if (input.substr(peg$currPos, 5) === peg$c18) {
				s1 = peg$c18;
				peg$currPos += 5;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c19);
			}
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$parsewsp();
				while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$parsewsp();
				}
				if (s2 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 40) {
						s3 = peg$c4;
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c5);
					}
					if (s3 !== peg$FAILED) {
						s4 = [];
						s5 = peg$parsewsp();
						while (s5 !== peg$FAILED) {
							s4.push(s5);
							s5 = peg$parsewsp();
						}
						if (s4 !== peg$FAILED) {
							s5 = peg$parsenumber();
							if (s5 !== peg$FAILED) {
								s6 = [];
								s7 = peg$parsewsp();
								while (s7 !== peg$FAILED) {
									s6.push(s7);
									s7 = peg$parsewsp();
								}
								if (s6 !== peg$FAILED) {
									if (input.charCodeAt(peg$currPos) === 41) {
										s7 = peg$c6;
										peg$currPos++;
									} else {
										s7 = peg$FAILED;
										if (peg$silentFails === 0) peg$fail(peg$c7);
									}
									if (s7 !== peg$FAILED) {
										s1 = peg$c20(s5);
										s0 = s1;
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parseskewY() {
			var s0 = peg$currPos, s1, s2, s3, s4, s5, s6, s7;
			if (input.substr(peg$currPos, 5) === peg$c21) {
				s1 = peg$c21;
				peg$currPos += 5;
			} else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c22);
			}
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$parsewsp();
				while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$parsewsp();
				}
				if (s2 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 40) {
						s3 = peg$c4;
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c5);
					}
					if (s3 !== peg$FAILED) {
						s4 = [];
						s5 = peg$parsewsp();
						while (s5 !== peg$FAILED) {
							s4.push(s5);
							s5 = peg$parsewsp();
						}
						if (s4 !== peg$FAILED) {
							s5 = peg$parsenumber();
							if (s5 !== peg$FAILED) {
								s6 = [];
								s7 = peg$parsewsp();
								while (s7 !== peg$FAILED) {
									s6.push(s7);
									s7 = peg$parsewsp();
								}
								if (s6 !== peg$FAILED) {
									if (input.charCodeAt(peg$currPos) === 41) {
										s7 = peg$c6;
										peg$currPos++;
									} else {
										s7 = peg$FAILED;
										if (peg$silentFails === 0) peg$fail(peg$c7);
									}
									if (s7 !== peg$FAILED) {
										s1 = peg$c23(s5);
										s0 = s1;
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parsenumber() {
			var s0 = peg$currPos, s1 = peg$currPos, s2 = peg$parsesign(), s3;
			if (s2 === peg$FAILED) s2 = null;
			if (s2 !== peg$FAILED) {
				s3 = peg$parsefloatingPointConstant();
				if (s3 !== peg$FAILED) {
					s2 = [s2, s3];
					s1 = s2;
				} else {
					peg$currPos = s1;
					s1 = peg$FAILED;
				}
			} else {
				peg$currPos = s1;
				s1 = peg$FAILED;
			}
			if (s1 !== peg$FAILED) s1 = peg$c24(s1);
			s0 = s1;
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				s1 = peg$currPos;
				s2 = peg$parsesign();
				if (s2 === peg$FAILED) s2 = null;
				if (s2 !== peg$FAILED) {
					s3 = peg$parseintegerConstant();
					if (s3 !== peg$FAILED) {
						s2 = [s2, s3];
						s1 = s2;
					} else {
						peg$currPos = s1;
						s1 = peg$FAILED;
					}
				} else {
					peg$currPos = s1;
					s1 = peg$FAILED;
				}
				if (s1 !== peg$FAILED) s1 = peg$c25(s1);
				s0 = s1;
			}
			return s0;
		}
		function peg$parsecommaWspNumber() {
			var s0 = peg$currPos, s1 = peg$parsecommaWsp(), s2;
			if (s1 !== peg$FAILED) {
				s2 = peg$parsenumber();
				if (s2 !== peg$FAILED) {
					s1 = peg$c26(s2);
					s0 = s1;
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parsecommaWspTwoNumbers() {
			var s0 = peg$currPos, s1 = peg$parsecommaWsp(), s2, s3, s4;
			if (s1 !== peg$FAILED) {
				s2 = peg$parsenumber();
				if (s2 !== peg$FAILED) {
					s3 = peg$parsecommaWsp();
					if (s3 !== peg$FAILED) {
						s4 = peg$parsenumber();
						if (s4 !== peg$FAILED) {
							s1 = peg$c27(s2, s4);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		function peg$parsecommaWsp() {
			var s0 = peg$currPos, s1 = [], s2 = peg$parsewsp(), s3, s4;
			if (s2 !== peg$FAILED) while (s2 !== peg$FAILED) {
				s1.push(s2);
				s2 = peg$parsewsp();
			}
			else s1 = peg$FAILED;
			if (s1 !== peg$FAILED) {
				s2 = peg$parsecomma();
				if (s2 === peg$FAILED) s2 = null;
				if (s2 !== peg$FAILED) {
					s3 = [];
					s4 = peg$parsewsp();
					while (s4 !== peg$FAILED) {
						s3.push(s4);
						s4 = peg$parsewsp();
					}
					if (s3 !== peg$FAILED) {
						s1 = [
							s1,
							s2,
							s3
						];
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				s1 = peg$parsecomma();
				if (s1 !== peg$FAILED) {
					s2 = [];
					s3 = peg$parsewsp();
					while (s3 !== peg$FAILED) {
						s2.push(s3);
						s3 = peg$parsewsp();
					}
					if (s2 !== peg$FAILED) {
						s1 = [s1, s2];
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			}
			return s0;
		}
		function peg$parsecomma() {
			var s0;
			if (input.charCodeAt(peg$currPos) === 44) {
				s0 = peg$c28;
				peg$currPos++;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c29);
			}
			return s0;
		}
		function peg$parseintegerConstant() {
			var s0 = peg$currPos, s1 = peg$parsedigitSequence();
			if (s1 !== peg$FAILED) s1 = peg$c30(s1);
			s0 = s1;
			return s0;
		}
		function peg$parsefloatingPointConstant() {
			var s0 = peg$currPos, s1 = peg$currPos, s2 = peg$parsefractionalConstant(), s3;
			if (s2 !== peg$FAILED) {
				s3 = peg$parseexponent();
				if (s3 === peg$FAILED) s3 = null;
				if (s3 !== peg$FAILED) {
					s2 = [s2, s3];
					s1 = s2;
				} else {
					peg$currPos = s1;
					s1 = peg$FAILED;
				}
			} else {
				peg$currPos = s1;
				s1 = peg$FAILED;
			}
			if (s1 !== peg$FAILED) s1 = peg$c31(s1);
			s0 = s1;
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				s1 = peg$currPos;
				s2 = peg$parsedigitSequence();
				if (s2 !== peg$FAILED) {
					s3 = peg$parseexponent();
					if (s3 !== peg$FAILED) {
						s2 = [s2, s3];
						s1 = s2;
					} else {
						peg$currPos = s1;
						s1 = peg$FAILED;
					}
				} else {
					peg$currPos = s1;
					s1 = peg$FAILED;
				}
				if (s1 !== peg$FAILED) s1 = peg$c32(s1);
				s0 = s1;
			}
			return s0;
		}
		function peg$parsefractionalConstant() {
			var s0, s1, s2, s3;
			peg$silentFails++;
			s0 = peg$currPos;
			s1 = peg$parsedigitSequence();
			if (s1 === peg$FAILED) s1 = null;
			if (s1 !== peg$FAILED) {
				if (input.charCodeAt(peg$currPos) === 46) {
					s2 = peg$c34;
					peg$currPos++;
				} else {
					s2 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c35);
				}
				if (s2 !== peg$FAILED) {
					s3 = peg$parsedigitSequence();
					if (s3 !== peg$FAILED) {
						s1 = peg$c36(s1, s3);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			if (s0 === peg$FAILED) {
				s0 = peg$currPos;
				s1 = peg$parsedigitSequence();
				if (s1 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 46) {
						s2 = peg$c34;
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c35);
					}
					if (s2 !== peg$FAILED) {
						s1 = peg$c32(s1);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			}
			peg$silentFails--;
			if (s0 === peg$FAILED) {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c33);
			}
			return s0;
		}
		function peg$parseexponent() {
			var s0 = peg$currPos, s1 = peg$currPos, s2, s3, s4;
			if (peg$c37.test(input.charAt(peg$currPos))) {
				s2 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s2 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c38);
			}
			if (s2 !== peg$FAILED) {
				s3 = peg$parsesign();
				if (s3 === peg$FAILED) s3 = null;
				if (s3 !== peg$FAILED) {
					s4 = peg$parsedigitSequence();
					if (s4 !== peg$FAILED) {
						s2 = [
							s2,
							s3,
							s4
						];
						s1 = s2;
					} else {
						peg$currPos = s1;
						s1 = peg$FAILED;
					}
				} else {
					peg$currPos = s1;
					s1 = peg$FAILED;
				}
			} else {
				peg$currPos = s1;
				s1 = peg$FAILED;
			}
			if (s1 !== peg$FAILED) s1 = peg$c39(s1);
			s0 = s1;
			return s0;
		}
		function peg$parsesign() {
			var s0;
			if (peg$c40.test(input.charAt(peg$currPos))) {
				s0 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c41);
			}
			return s0;
		}
		function peg$parsedigitSequence() {
			var s0 = [], s1 = peg$parsedigit();
			if (s1 !== peg$FAILED) while (s1 !== peg$FAILED) {
				s0.push(s1);
				s1 = peg$parsedigit();
			}
			else s0 = peg$FAILED;
			return s0;
		}
		function peg$parsedigit() {
			var s0;
			if (peg$c42.test(input.charAt(peg$currPos))) {
				s0 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c43);
			}
			return s0;
		}
		function peg$parsewsp() {
			var s0;
			if (peg$c44.test(input.charAt(peg$currPos))) {
				s0 = input.charAt(peg$currPos);
				peg$currPos++;
			} else {
				s0 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$c45);
			}
			return s0;
		}
		var deg2rad = Math.PI / 180;
		function multiply_matrices(l, r) {
			var al = l[0];
			var cl = l[1];
			var el = l[2];
			var bl = l[3];
			var dl = l[4];
			var fl = l[5];
			var ar = r[0];
			var cr = r[1];
			var er = r[2];
			var br = r[3];
			var dr = r[4];
			var fr = r[5];
			return [
				al * ar + cl * br,
				al * cr + cl * dr,
				al * er + cl * fr + el,
				bl * ar + dl * br,
				bl * cr + dl * dr,
				bl * er + dl * fr + fl
			];
		}
		peg$result = peg$startRuleFunction();
		if (peg$result !== peg$FAILED && peg$currPos === input.length) return peg$result;
		else {
			if (peg$result !== peg$FAILED && peg$currPos < input.length) peg$fail(peg$endExpectation());
			throw peg$buildStructuredError(peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
		}
	}
	module.exports = {
		SyntaxError: peg$SyntaxError,
		parse: peg$parse
	};
}));
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/lib/extract/transformToRn.js
var require_transformToRn = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function peg$subclass(child, parent) {
		function C() {
			this.constructor = child;
		}
		C.prototype = parent.prototype;
		child.prototype = new C();
	}
	function peg$SyntaxError(message, expected, found, location) {
		var self = Error.call(this, message);
		// istanbul ignore next Check is a necessary evil to support older environments
		if (Object.setPrototypeOf) Object.setPrototypeOf(self, peg$SyntaxError.prototype);
		self.expected = expected;
		self.found = found;
		self.location = location;
		self.name = "SyntaxError";
		return self;
	}
	peg$subclass(peg$SyntaxError, Error);
	function peg$padEnd(str, targetLength, padString) {
		padString = padString || " ";
		if (str.length > targetLength) return str;
		targetLength -= str.length;
		padString += padString.repeat(targetLength);
		return str + padString.slice(0, targetLength);
	}
	peg$SyntaxError.prototype.format = function(sources) {
		var str = "Error: " + this.message;
		if (this.location) {
			var src = null;
			var k = 0;
			for (; k < sources.length; k++) if (sources[k].source === this.location.source) {
				src = sources[k].text.split(/\r\n|\n|\r/g);
				break;
			}
			var s = this.location.start;
			var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
			var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
			if (src) {
				var e = this.location.end;
				var filler = peg$padEnd("", offset_s.line.toString().length, " ");
				var line = src[s.line - 1];
				var hatLen = (s.line === e.line ? e.column : line.length + 1) - s.column || 1;
				str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s.column - 1, " ") + peg$padEnd("", hatLen, "^");
			} else str += "\n at " + loc;
		}
		return str;
	};
	peg$SyntaxError.buildMessage = function(expected, found) {
		var DESCRIBE_EXPECTATION_FNS = {
			literal: function(expectation) {
				return "\"" + literalEscape(expectation.text) + "\"";
			},
			class: function(expectation) {
				var escapedParts = expectation.parts.map(function(part) {
					return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
				});
				return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
			},
			any: function() {
				return "any character";
			},
			end: function() {
				return "end of input";
			},
			other: function(expectation) {
				return expectation.description;
			}
		};
		function hex(ch) {
			return ch.charCodeAt(0).toString(16).toUpperCase();
		}
		function literalEscape(s) {
			return s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
				return "\\x0" + hex(ch);
			}).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
				return "\\x" + hex(ch);
			});
		}
		function classEscape(s) {
			return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
				return "\\x0" + hex(ch);
			}).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
				return "\\x" + hex(ch);
			});
		}
		function describeExpectation(expectation) {
			return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
		}
		function describeExpected(expected) {
			var descriptions = expected.map(describeExpectation);
			var i, j;
			descriptions.sort();
			if (descriptions.length > 0) {
				for (i = 1, j = 1; i < descriptions.length; i++) if (descriptions[i - 1] !== descriptions[i]) {
					descriptions[j] = descriptions[i];
					j++;
				}
				descriptions.length = j;
			}
			switch (descriptions.length) {
				case 1: return descriptions[0];
				case 2: return descriptions[0] + " or " + descriptions[1];
				default: return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
			}
		}
		function describeFound(found) {
			return found ? "\"" + literalEscape(found) + "\"" : "end of input";
		}
		return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
	};
	function peg$parse(input, options) {
		options = options !== void 0 ? options : {};
		var peg$FAILED = {};
		var peg$source = options.grammarSource;
		var peg$startRuleFunctions = { start: peg$parsestart };
		var peg$startRuleFunction = peg$parsestart;
		var peg$c0 = "matrix(";
		var peg$c1 = ")";
		var peg$c2 = "translate(";
		var peg$c3 = "scale(";
		var peg$c4 = "rotate(";
		var peg$c5 = "skewX(";
		var peg$c6 = "skewY(";
		var peg$c7 = ".";
		var peg$c8 = "e";
		var peg$r0 = /^[ \t\n\r,]/;
		var peg$r1 = /^[ \t\n\r]/;
		var peg$r2 = /^[+\-]/;
		var peg$r3 = /^[0-9]/;
		var peg$e0 = peg$otherExpectation("transform functions");
		var peg$e1 = peg$otherExpectation("transformFunctions");
		var peg$e2 = peg$otherExpectation("transform function");
		var peg$e3 = peg$otherExpectation("matrix");
		var peg$e4 = peg$literalExpectation("matrix(", false);
		var peg$e5 = peg$literalExpectation(")", false);
		var peg$e6 = peg$otherExpectation("translate");
		var peg$e7 = peg$literalExpectation("translate(", false);
		var peg$e8 = peg$otherExpectation("scale");
		var peg$e9 = peg$literalExpectation("scale(", false);
		var peg$e10 = peg$otherExpectation("rotate");
		var peg$e11 = peg$literalExpectation("rotate(", false);
		var peg$e12 = peg$otherExpectation("x, y");
		var peg$e13 = peg$otherExpectation("skewX");
		var peg$e14 = peg$literalExpectation("skewX(", false);
		var peg$e15 = peg$otherExpectation("skewY");
		var peg$e16 = peg$literalExpectation("skewY(", false);
		var peg$e17 = peg$otherExpectation("space or comma");
		var peg$e18 = peg$classExpectation([
			" ",
			"	",
			"\n",
			"\r",
			","
		], false, false);
		var peg$e19 = peg$otherExpectation("whitespace");
		var peg$e20 = peg$classExpectation([
			" ",
			"	",
			"\n",
			"\r"
		], false, false);
		var peg$e21 = peg$classExpectation(["+", "-"], false, false);
		var peg$e22 = peg$classExpectation([["0", "9"]], false, false);
		var peg$e23 = peg$literalExpectation(".", false);
		var peg$e24 = peg$literalExpectation("e", false);
		var peg$f0 = function(head, tail) {
			const results = Array.isArray(head) ? head : [head];
			tail.forEach((element) => {
				if (Array.isArray(element[1])) results.push(...element[1]);
				else results.push(element[1]);
			});
			return results;
		};
		var peg$f1 = function(a, b, c, d, e, f, g, h, i) {
			return { matrix: [
				a,
				b,
				c,
				d,
				e,
				f,
				g,
				h,
				i
			] };
		};
		var peg$f2 = function(x, y) {
			if (y == void 0) return { translate: x };
			return { translate: [x, y] };
		};
		var peg$f3 = function(x, y) {
			if (y == void 0) return { scale: x };
			return [{ scaleX: x }, { scaleY: y }];
		};
		var peg$f4 = function(x, yz) {
			if (yz !== null) return { rotate: `${x}deg` };
			return [{ rotate: `${x}deg` }];
		};
		var peg$f5 = function(y, z) {
			return [y, z];
		};
		var peg$f6 = function(x) {
			return [{ skewX: `${x}deg` }];
		};
		var peg$f7 = function(y) {
			return [{ skewY: `${y}deg` }];
		};
		var peg$f8 = function() {
			return parseFloat(text());
		};
		var peg$currPos = options.peg$currPos | 0;
		var peg$savedPos = peg$currPos;
		var peg$posDetailsCache = [{
			line: 1,
			column: 1
		}];
		var peg$maxFailPos = peg$currPos;
		var peg$maxFailExpected = options.peg$maxFailExpected || [];
		var peg$silentFails = options.peg$silentFails | 0;
		var peg$result;
		if (options.startRule) {
			if (!(options.startRule in peg$startRuleFunctions)) throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
			peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
		}
		function text() {
			return input.substring(peg$savedPos, peg$currPos);
		}
		function peg$literalExpectation(text, ignoreCase) {
			return {
				type: "literal",
				text,
				ignoreCase
			};
		}
		function peg$classExpectation(parts, inverted, ignoreCase) {
			return {
				type: "class",
				parts,
				inverted,
				ignoreCase
			};
		}
		function peg$endExpectation() {
			return { type: "end" };
		}
		function peg$otherExpectation(description) {
			return {
				type: "other",
				description
			};
		}
		function peg$computePosDetails(pos) {
			var details = peg$posDetailsCache[pos];
			var p;
			if (details) return details;
			else {
				if (pos >= peg$posDetailsCache.length) p = peg$posDetailsCache.length - 1;
				else {
					p = pos;
					while (!peg$posDetailsCache[--p]);
				}
				details = peg$posDetailsCache[p];
				details = {
					line: details.line,
					column: details.column
				};
				while (p < pos) {
					if (input.charCodeAt(p) === 10) {
						details.line++;
						details.column = 1;
					} else details.column++;
					p++;
				}
				peg$posDetailsCache[pos] = details;
				return details;
			}
		}
		function peg$computeLocation(startPos, endPos, offset) {
			var startPosDetails = peg$computePosDetails(startPos);
			var endPosDetails = peg$computePosDetails(endPos);
			var res = {
				source: peg$source,
				start: {
					offset: startPos,
					line: startPosDetails.line,
					column: startPosDetails.column
				},
				end: {
					offset: endPos,
					line: endPosDetails.line,
					column: endPosDetails.column
				}
			};
			if (offset && peg$source && typeof peg$source.offset === "function") {
				res.start = peg$source.offset(res.start);
				res.end = peg$source.offset(res.end);
			}
			return res;
		}
		function peg$fail(expected) {
			if (peg$currPos < peg$maxFailPos) return;
			if (peg$currPos > peg$maxFailPos) {
				peg$maxFailPos = peg$currPos;
				peg$maxFailExpected = [];
			}
			peg$maxFailExpected.push(expected);
		}
		function peg$buildStructuredError(expected, found, location) {
			return new peg$SyntaxError(peg$SyntaxError.buildMessage(expected, found), expected, found, location);
		}
		function peg$parsestart() {
			var s0;
			peg$silentFails++;
			s0 = peg$parsetransformFunctions();
			peg$silentFails--;
			if (s0 === peg$FAILED) {
				if (peg$silentFails === 0) peg$fail(peg$e0);
			}
			return s0;
		}
		function peg$parsetransformFunctions() {
			var s0, s1, s2, s3, s4, s5;
			peg$silentFails++;
			s0 = peg$currPos;
			s1 = peg$parsefunction();
			if (s1 !== peg$FAILED) {
				s2 = [];
				s3 = peg$currPos;
				s4 = peg$parse_();
				s5 = peg$parsefunction();
				if (s5 !== peg$FAILED) {
					s4 = [s4, s5];
					s3 = s4;
				} else {
					peg$currPos = s3;
					s3 = peg$FAILED;
				}
				while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = peg$currPos;
					s4 = peg$parse_();
					s5 = peg$parsefunction();
					if (s5 !== peg$FAILED) {
						s4 = [s4, s5];
						s3 = s4;
					} else {
						peg$currPos = s3;
						s3 = peg$FAILED;
					}
				}
				peg$savedPos = s0;
				s0 = peg$f0(s1, s2);
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			peg$silentFails--;
			if (s0 === peg$FAILED) {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$e1);
			}
			return s0;
		}
		function peg$parsefunction() {
			var s0;
			peg$silentFails++;
			s0 = peg$parsematrix();
			if (s0 === peg$FAILED) {
				s0 = peg$parsetranslate();
				if (s0 === peg$FAILED) {
					s0 = peg$parsescale();
					if (s0 === peg$FAILED) {
						s0 = peg$parserotate();
						if (s0 === peg$FAILED) {
							s0 = peg$parseskewX();
							if (s0 === peg$FAILED) s0 = peg$parseskewY();
						}
					}
				}
			}
			peg$silentFails--;
			if (s0 === peg$FAILED) {
				if (peg$silentFails === 0) peg$fail(peg$e2);
			}
			return s0;
		}
		function peg$parsematrix() {
			var s0, s2, s4, s6, s8, s10, s12, s14, s16, s18, s20, s22;
			peg$silentFails++;
			s0 = peg$currPos;
			peg$parse_();
			if (input.substr(peg$currPos, 7) === peg$c0) {
				s2 = peg$c0;
				peg$currPos += 7;
			} else {
				s2 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$e4);
			}
			if (s2 !== peg$FAILED) {
				peg$parse_();
				s4 = peg$parseNUM();
				if (s4 !== peg$FAILED) {
					peg$parsespaceOrComma();
					s6 = peg$parseNUM();
					if (s6 !== peg$FAILED) {
						peg$parsespaceOrComma();
						s8 = peg$parseNUM();
						if (s8 !== peg$FAILED) {
							peg$parsespaceOrComma();
							s10 = peg$parseNUM();
							if (s10 !== peg$FAILED) {
								peg$parsespaceOrComma();
								s12 = peg$parseNUM();
								if (s12 !== peg$FAILED) {
									peg$parsespaceOrComma();
									s14 = peg$parseNUM();
									if (s14 !== peg$FAILED) {
										peg$parsespaceOrComma();
										s16 = peg$parseNUM();
										if (s16 !== peg$FAILED) {
											peg$parsespaceOrComma();
											s18 = peg$parseNUM();
											if (s18 !== peg$FAILED) {
												peg$parsespaceOrComma();
												s20 = peg$parseNUM();
												if (s20 !== peg$FAILED) {
													peg$parse_();
													if (input.charCodeAt(peg$currPos) === 41) {
														s22 = peg$c1;
														peg$currPos++;
													} else {
														s22 = peg$FAILED;
														if (peg$silentFails === 0) peg$fail(peg$e5);
													}
													if (s22 !== peg$FAILED) {
														peg$parse_();
														peg$savedPos = s0;
														s0 = peg$f1(s4, s6, s8, s10, s12, s14, s16, s18, s20);
													} else {
														peg$currPos = s0;
														s0 = peg$FAILED;
													}
												} else {
													peg$currPos = s0;
													s0 = peg$FAILED;
												}
											} else {
												peg$currPos = s0;
												s0 = peg$FAILED;
											}
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			peg$silentFails--;
			if (s0 === peg$FAILED) {
				if (peg$silentFails === 0) peg$fail(peg$e3);
			}
			return s0;
		}
		function peg$parsetranslate() {
			var s0, s2, s4, s6, s8;
			peg$silentFails++;
			s0 = peg$currPos;
			peg$parse_();
			if (input.substr(peg$currPos, 10) === peg$c2) {
				s2 = peg$c2;
				peg$currPos += 10;
			} else {
				s2 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$e7);
			}
			if (s2 !== peg$FAILED) {
				peg$parse_();
				s4 = peg$parseNUM();
				if (s4 !== peg$FAILED) {
					peg$parsespaceOrComma();
					s6 = peg$parseNUM();
					if (s6 === peg$FAILED) s6 = null;
					peg$parse_();
					if (input.charCodeAt(peg$currPos) === 41) {
						s8 = peg$c1;
						peg$currPos++;
					} else {
						s8 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$e5);
					}
					if (s8 !== peg$FAILED) {
						peg$parse_();
						peg$savedPos = s0;
						s0 = peg$f2(s4, s6);
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			peg$silentFails--;
			if (s0 === peg$FAILED) {
				if (peg$silentFails === 0) peg$fail(peg$e6);
			}
			return s0;
		}
		function peg$parsescale() {
			var s0, s2, s4, s6, s8;
			peg$silentFails++;
			s0 = peg$currPos;
			peg$parse_();
			if (input.substr(peg$currPos, 6) === peg$c3) {
				s2 = peg$c3;
				peg$currPos += 6;
			} else {
				s2 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$e9);
			}
			if (s2 !== peg$FAILED) {
				peg$parse_();
				s4 = peg$parseNUM();
				if (s4 !== peg$FAILED) {
					peg$parsespaceOrComma();
					s6 = peg$parseNUM();
					if (s6 === peg$FAILED) s6 = null;
					peg$parse_();
					if (input.charCodeAt(peg$currPos) === 41) {
						s8 = peg$c1;
						peg$currPos++;
					} else {
						s8 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$e5);
					}
					if (s8 !== peg$FAILED) {
						peg$parse_();
						peg$savedPos = s0;
						s0 = peg$f3(s4, s6);
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			peg$silentFails--;
			if (s0 === peg$FAILED) {
				if (peg$silentFails === 0) peg$fail(peg$e8);
			}
			return s0;
		}
		function peg$parserotate() {
			var s0, s2, s4, s5, s7;
			peg$silentFails++;
			s0 = peg$currPos;
			peg$parse_();
			if (input.substr(peg$currPos, 7) === peg$c4) {
				s2 = peg$c4;
				peg$currPos += 7;
			} else {
				s2 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$e11);
			}
			if (s2 !== peg$FAILED) {
				peg$parse_();
				s4 = peg$parseNUM();
				if (s4 !== peg$FAILED) {
					s5 = peg$parsetwoNumbers();
					if (s5 === peg$FAILED) s5 = null;
					peg$parse_();
					if (input.charCodeAt(peg$currPos) === 41) {
						s7 = peg$c1;
						peg$currPos++;
					} else {
						s7 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$e5);
					}
					if (s7 !== peg$FAILED) {
						peg$parse_();
						peg$savedPos = s0;
						s0 = peg$f4(s4, s5);
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			peg$silentFails--;
			if (s0 === peg$FAILED) {
				if (peg$silentFails === 0) peg$fail(peg$e10);
			}
			return s0;
		}
		function peg$parsetwoNumbers() {
			var s0, s2, s4;
			peg$silentFails++;
			s0 = peg$currPos;
			peg$parsespaceOrComma();
			s2 = peg$parseNUM();
			if (s2 !== peg$FAILED) {
				peg$parsespaceOrComma();
				s4 = peg$parseNUM();
				if (s4 !== peg$FAILED) {
					peg$savedPos = s0;
					s0 = peg$f5(s2, s4);
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			peg$silentFails--;
			if (s0 === peg$FAILED) {
				if (peg$silentFails === 0) peg$fail(peg$e12);
			}
			return s0;
		}
		function peg$parseskewX() {
			var s0, s2, s4, s6;
			peg$silentFails++;
			s0 = peg$currPos;
			peg$parse_();
			if (input.substr(peg$currPos, 6) === peg$c5) {
				s2 = peg$c5;
				peg$currPos += 6;
			} else {
				s2 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$e14);
			}
			if (s2 !== peg$FAILED) {
				peg$parse_();
				s4 = peg$parseNUM();
				if (s4 !== peg$FAILED) {
					peg$parse_();
					if (input.charCodeAt(peg$currPos) === 41) {
						s6 = peg$c1;
						peg$currPos++;
					} else {
						s6 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$e5);
					}
					if (s6 !== peg$FAILED) {
						peg$parse_();
						peg$savedPos = s0;
						s0 = peg$f6(s4);
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			peg$silentFails--;
			if (s0 === peg$FAILED) {
				if (peg$silentFails === 0) peg$fail(peg$e13);
			}
			return s0;
		}
		function peg$parseskewY() {
			var s0, s2, s4, s6;
			peg$silentFails++;
			s0 = peg$currPos;
			peg$parse_();
			if (input.substr(peg$currPos, 6) === peg$c6) {
				s2 = peg$c6;
				peg$currPos += 6;
			} else {
				s2 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$e16);
			}
			if (s2 !== peg$FAILED) {
				peg$parse_();
				s4 = peg$parseNUM();
				if (s4 !== peg$FAILED) {
					peg$parse_();
					if (input.charCodeAt(peg$currPos) === 41) {
						s6 = peg$c1;
						peg$currPos++;
					} else {
						s6 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$e5);
					}
					if (s6 !== peg$FAILED) {
						peg$parse_();
						peg$savedPos = s0;
						s0 = peg$f7(s4);
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			peg$silentFails--;
			if (s0 === peg$FAILED) {
				if (peg$silentFails === 0) peg$fail(peg$e15);
			}
			return s0;
		}
		function peg$parsespaceOrComma() {
			var s0, s1;
			peg$silentFails++;
			s0 = [];
			s1 = input.charAt(peg$currPos);
			if (peg$r0.test(s1)) peg$currPos++;
			else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$e18);
			}
			while (s1 !== peg$FAILED) {
				s0.push(s1);
				s1 = input.charAt(peg$currPos);
				if (peg$r0.test(s1)) peg$currPos++;
				else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$e18);
				}
			}
			peg$silentFails--;
			s1 = peg$FAILED;
			if (peg$silentFails === 0) peg$fail(peg$e17);
			return s0;
		}
		function peg$parse_() {
			var s0, s1;
			peg$silentFails++;
			s0 = [];
			s1 = input.charAt(peg$currPos);
			if (peg$r1.test(s1)) peg$currPos++;
			else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$e20);
			}
			while (s1 !== peg$FAILED) {
				s0.push(s1);
				s1 = input.charAt(peg$currPos);
				if (peg$r1.test(s1)) peg$currPos++;
				else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$e20);
				}
			}
			peg$silentFails--;
			s1 = peg$FAILED;
			if (peg$silentFails === 0) peg$fail(peg$e19);
			return s0;
		}
		function peg$parseNUM() {
			var s0 = peg$currPos, s1 = input.charAt(peg$currPos), s2, s3, s4, s5, s6, s7;
			if (peg$r2.test(s1)) peg$currPos++;
			else {
				s1 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$e21);
			}
			if (s1 === peg$FAILED) s1 = null;
			s2 = peg$currPos;
			s3 = [];
			s4 = input.charAt(peg$currPos);
			if (peg$r3.test(s4)) peg$currPos++;
			else {
				s4 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$e22);
			}
			while (s4 !== peg$FAILED) {
				s3.push(s4);
				s4 = input.charAt(peg$currPos);
				if (peg$r3.test(s4)) peg$currPos++;
				else {
					s4 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$e22);
				}
			}
			if (input.charCodeAt(peg$currPos) === 46) {
				s4 = peg$c7;
				peg$currPos++;
			} else {
				s4 = peg$FAILED;
				if (peg$silentFails === 0) peg$fail(peg$e23);
			}
			if (s4 !== peg$FAILED) {
				s5 = [];
				s6 = input.charAt(peg$currPos);
				if (peg$r3.test(s6)) peg$currPos++;
				else {
					s6 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$e22);
				}
				if (s6 !== peg$FAILED) while (s6 !== peg$FAILED) {
					s5.push(s6);
					s6 = input.charAt(peg$currPos);
					if (peg$r3.test(s6)) peg$currPos++;
					else {
						s6 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$e22);
					}
				}
				else s5 = peg$FAILED;
				if (s5 !== peg$FAILED) {
					s3 = [
						s3,
						s4,
						s5
					];
					s2 = s3;
				} else {
					peg$currPos = s2;
					s2 = peg$FAILED;
				}
			} else {
				peg$currPos = s2;
				s2 = peg$FAILED;
			}
			if (s2 === peg$FAILED) {
				s2 = [];
				s3 = input.charAt(peg$currPos);
				if (peg$r3.test(s3)) peg$currPos++;
				else {
					s3 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$e22);
				}
				if (s3 !== peg$FAILED) while (s3 !== peg$FAILED) {
					s2.push(s3);
					s3 = input.charAt(peg$currPos);
					if (peg$r3.test(s3)) peg$currPos++;
					else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$e22);
					}
				}
				else s2 = peg$FAILED;
			}
			if (s2 !== peg$FAILED) {
				s3 = peg$currPos;
				if (input.charCodeAt(peg$currPos) === 101) {
					s4 = peg$c8;
					peg$currPos++;
				} else {
					s4 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$e24);
				}
				if (s4 !== peg$FAILED) {
					s5 = input.charAt(peg$currPos);
					if (peg$r2.test(s5)) peg$currPos++;
					else {
						s5 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$e21);
					}
					if (s5 === peg$FAILED) s5 = null;
					s6 = [];
					s7 = input.charAt(peg$currPos);
					if (peg$r3.test(s7)) peg$currPos++;
					else {
						s7 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$e22);
					}
					if (s7 !== peg$FAILED) while (s7 !== peg$FAILED) {
						s6.push(s7);
						s7 = input.charAt(peg$currPos);
						if (peg$r3.test(s7)) peg$currPos++;
						else {
							s7 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$e22);
						}
					}
					else s6 = peg$FAILED;
					if (s6 !== peg$FAILED) {
						s4 = [
							s4,
							s5,
							s6
						];
						s3 = s4;
					} else {
						peg$currPos = s3;
						s3 = peg$FAILED;
					}
				} else {
					peg$currPos = s3;
					s3 = peg$FAILED;
				}
				if (s3 === peg$FAILED) s3 = null;
				peg$savedPos = s0;
				s0 = peg$f8();
			} else {
				peg$currPos = s0;
				s0 = peg$FAILED;
			}
			return s0;
		}
		peg$result = peg$startRuleFunction();
		if (options.peg$library) return {
			peg$result,
			peg$currPos,
			peg$FAILED,
			peg$maxFailExpected,
			peg$maxFailPos
		};
		if (peg$result !== peg$FAILED && peg$currPos === input.length) return peg$result;
		else {
			if (peg$result !== peg$FAILED && peg$currPos < input.length) peg$fail(peg$endExpectation());
			throw peg$buildStructuredError(peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
		}
	}
	module.exports = {
		StartRules: ["start"],
		SyntaxError: peg$SyntaxError,
		parse: peg$parse
	};
}));
require_transform();
require_transformToRn();
var getAngleValueInDeg = (angle) => {
	if (angle.endsWith("rad")) return parseFloat(angle) * (180 / Math.PI);
	if (angle.endsWith("deg")) return parseFloat(angle);
};
function stringifyTransformArrayProps(transformArray) {
	if (!transformArray) return "";
	return transformArray.map((transform) => {
		const [key, value] = Object.entries(transform)[0];
		switch (key) {
			case "translateX": return `translate(${value}, 0)`;
			case "translateY": return `translate(0, ${value})`;
			case "rotate": return `rotate(${getAngleValueInDeg(value)})`;
			case "scale": return `scale(${value})`;
			case "scaleX": return `scale(${value}, 1)`;
			case "scaleY": return `scale(1, ${value})`;
			case "skewX": return `skewX(${getAngleValueInDeg(value)})`;
			case "skewY": return `skewY(${getAngleValueInDeg(value)})`;
			case "matrix": return `matrix(${value.join(", ")})`;
			default: return "";
		}
	}).join(" ");
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/web/utils/parseTransform.ts
function parseTransformProp(transform, props) {
	const transformArray = [];
	props && transformArray.push(...stringifyTransformProps(props));
	if (Array.isArray(transform)) {
		if (typeof transform[0] === "number") transformArray.push(`matrix(${transform.join(" ")})`);
		else {
			const stringifiedProps = stringifyTransformArrayProps(transform).split(" ");
			transformArray.push(...stringifiedProps);
		}
	} else if (typeof transform === "string") transformArray.push(transform);
	return transformArray.length ? transformArray.join(" ") : void 0;
}
function stringifyTransformProps(transformProps) {
	const transformArray = [];
	if (transformProps.translate != null) transformArray.push(`translate(${transformProps.translate})`);
	if (transformProps.translateX != null || transformProps.translateY != null) transformArray.push(`translate(${transformProps.translateX || 0}, ${transformProps.translateY || 0})`);
	if (transformProps.scale != null) transformArray.push(`scale(${transformProps.scale})`);
	if (transformProps.scaleX != null || transformProps.scaleY != null) transformArray.push(`scale(${transformProps.scaleX || 1}, ${transformProps.scaleY || 1})`);
	if (transformProps.rotation != null) transformArray.push(`rotate(${transformProps.rotation})`);
	if (transformProps.skewX != null) transformArray.push(`skewX(${transformProps.skewX})`);
	if (transformProps.skewY != null) transformArray.push(`skewY(${transformProps.skewY})`);
	return transformArray;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/lib/resolve.ts
function resolve(styleProp, cleanedProps) {
	if (styleProp) return StyleSheet ? [styleProp, cleanedProps] : styleProp[Symbol.iterator] ? Object.assign({}, ...styleProp, cleanedProps) : Object.assign({}, styleProp, cleanedProps);
	else return cleanedProps;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/lib/resolveAssetUri.ts
var import_registry = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var assets = [];
	function registerAsset(asset) {
		return assets.push(asset);
	}
	function getAssetByID(assetId) {
		return assets[assetId - 1];
	}
	module.exports = {
		registerAsset,
		getAssetByID
	};
})))();
var svgDataUriPattern = /^(data:image\/svg\+xml;utf8,)(.*)/;
function resolveAssetUri(source) {
	let src = {};
	if (typeof source === "number") {
		const asset = (0, import_registry.getAssetByID)(source);
		if (asset == null) throw new Error(`Image: asset with ID "${source}" could not be found. Please check the image source or packager.`);
		src = {
			width: asset.width,
			height: asset.height,
			scale: asset.scales[0]
		};
		if (asset.scales.length > 1) {
			const preferredScale = PixelRatio.get();
			src.scale = asset.scales.reduce((prev, curr) => Math.abs(curr - preferredScale) < Math.abs(prev - preferredScale) ? curr : prev);
		}
		const scaleSuffix = src.scale !== 1 ? `@${src.scale}x` : "";
		src.uri = asset ? `${asset.httpServerLocation}/${asset.name}${scaleSuffix}.${asset.type}` : "";
	} else if (typeof source === "string") src.uri = source;
	else if (source && !Array.isArray(source) && typeof source.uri === "string") src.uri = source.uri;
	if (src.uri) {
		const match = src?.uri?.match(svgDataUriPattern);
		if (match) {
			const [, prefix, svg] = match;
			src.uri = `${prefix}${encodeURIComponent(svg)}`;
			return src;
		}
	}
	return src;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/web/utils/prepare.ts
/**
* `react-native-svg` supports additional props that aren't defined in the spec.
* This function replaces them in a spec conforming manner.
*
* @param {WebShape} self Instance given to us.
* @param {Object?} props Optional overridden props given to us.
* @returns {Object} Cleaned props object.
* @private
*/
var prepare = (self, props = self.props) => {
	const { transform, origin, originX, originY, fontFamily, fontSize, fontWeight, fontStyle, style, forwardedRef, gradientTransform, patternTransform, onPress, ...rest } = props;
	const clean = {
		...hasTouchableProperty(props) ? {
			onStartShouldSetResponder: self.touchableHandleStartShouldSetResponder,
			onResponderTerminationRequest: self.touchableHandleResponderTerminationRequest,
			onResponderGrant: self.touchableHandleResponderGrant,
			onResponderMove: self.touchableHandleResponderMove,
			onResponderRelease: self.touchableHandleResponderRelease,
			onResponderTerminate: self.touchableHandleResponderTerminate
		} : null,
		...rest
	};
	if (origin != null) clean["transform-origin"] = origin.toString().replace(",", " ");
	else if (originX != null || originY != null) clean["transform-origin"] = `${originX || 0} ${originY || 0}`;
	const parsedTransform = parseTransformProp(transform, props);
	if (parsedTransform) clean.transform = parsedTransform;
	const parsedGradientTransform = parseTransformProp(gradientTransform);
	if (parsedGradientTransform) clean.gradientTransform = parsedGradientTransform;
	const parsedPatternTransform = parseTransformProp(patternTransform);
	if (parsedPatternTransform) clean.patternTransform = parsedPatternTransform;
	clean.ref = (el) => {
		self.elementRef.current = el;
		if (typeof forwardedRef === "function") forwardedRef(el);
		else if (forwardedRef) forwardedRef.current = el;
	};
	const styles = {};
	if (fontFamily != null) styles.fontFamily = fontFamily;
	if (fontSize != null) styles.fontSize = fontSize;
	if (fontWeight != null) styles.fontWeight = fontWeight;
	if (fontStyle != null) styles.fontStyle = fontStyle;
	clean.style = resolve(style, styles);
	if (onPress !== null) clean.onClick = props.onPress;
	if (props.href !== null && props.href !== void 0) clean.href = resolveAssetUri(props.href)?.uri;
	return clean;
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/web/utils/convertInt32Color.ts
function convertInt32ColorToRGBA(color) {
	return `rgba(${color >> 16 & 255},${color >> 8 & 255},${color & 255},${((color >> 24 & 255) / 255).toFixed(2)})`;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/lib/SvgTouchableMixin.ts
var PRESS_RETENTION_OFFSET = {
	top: 20,
	left: 20,
	right: 20,
	bottom: 30
};
var { Mixin } = Touchable;
var { touchableHandleStartShouldSetResponder, touchableHandleResponderTerminationRequest, touchableHandleResponderGrant, touchableHandleResponderMove, touchableHandleResponderRelease, touchableHandleResponderTerminate, touchableGetInitialState } = Mixin;
var SvgTouchableMixin = {
	...Mixin,
	touchableHandleStartShouldSetResponder(e) {
		const { onStartShouldSetResponder } = this.props;
		if (onStartShouldSetResponder) return onStartShouldSetResponder(e);
		else return touchableHandleStartShouldSetResponder.call(this, e);
	},
	touchableHandleResponderTerminationRequest(e) {
		const { onResponderTerminationRequest } = this.props;
		if (onResponderTerminationRequest) return onResponderTerminationRequest(e);
		else return touchableHandleResponderTerminationRequest.call(this, e);
	},
	touchableHandleResponderGrant(e) {
		const { onResponderGrant } = this.props;
		if (onResponderGrant) return onResponderGrant(e);
		else return touchableHandleResponderGrant.call(this, e);
	},
	touchableHandleResponderMove(e) {
		const { onResponderMove } = this.props;
		if (onResponderMove) return onResponderMove(e);
		else return touchableHandleResponderMove.call(this, e);
	},
	touchableHandleResponderRelease(e) {
		const { onResponderRelease } = this.props;
		if (onResponderRelease) return onResponderRelease(e);
		else return touchableHandleResponderRelease.call(this, e);
	},
	touchableHandleResponderTerminate(e) {
		const { onResponderTerminate } = this.props;
		if (onResponderTerminate) return onResponderTerminate(e);
		else return touchableHandleResponderTerminate.call(this, e);
	},
	touchableHandlePress(e) {
		const { onPress } = this.props;
		onPress && onPress(e);
	},
	touchableHandleActivePressIn(e) {
		const { onPressIn } = this.props;
		onPressIn && onPressIn(e);
	},
	touchableHandleActivePressOut(e) {
		const { onPressOut } = this.props;
		onPressOut && onPressOut(e);
	},
	touchableHandleLongPress(e) {
		const { onLongPress } = this.props;
		onLongPress && onLongPress(e);
	},
	touchableGetPressRectOffset() {
		const { pressRetentionOffset } = this.props;
		return pressRetentionOffset || PRESS_RETENTION_OFFSET;
	},
	touchableGetHitSlop() {
		const { hitSlop } = this.props;
		return hitSlop;
	},
	touchableGetHighlightDelayMS() {
		const { delayPressIn } = this.props;
		return delayPressIn || 0;
	},
	touchableGetLongPressDelayMS() {
		const { delayLongPress } = this.props;
		return delayLongPress === 0 ? 0 : delayLongPress || 500;
	},
	touchableGetPressOutDelayMS() {
		const { delayPressOut } = this.props;
		return delayPressOut || 0;
	}
};
var touchKeys = Object.keys(SvgTouchableMixin);
var touchVals = touchKeys.map((key) => SvgTouchableMixin[key]);
var numTouchKeys = touchKeys.length;
var SvgTouchableMixin_default = (target) => {
	for (let i = 0; i < numTouchKeys; i++) {
		const key = touchKeys[i];
		const val = touchVals[i];
		if (typeof val === "function") target[key] = val.bind(target);
		else target[key] = val;
	}
	target.state = touchableGetInitialState();
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/web/WebShape.ts
var WebShape = class extends import_react.Component {
	tag;
	prepareProps(props) {
		return props;
	}
	elementRef = import_react.createRef();
	lastMergedProps = {};
	/**
	* disclaimer: I am not sure why the props are wrapped in a `style` attribute here, but that's how reanimated calls it
	*/
	setNativeProps(props) {
		const merged = Object.assign({}, this.props, this.lastMergedProps, props.style);
		this.lastMergedProps = merged;
		const clean = prepare(this, this.prepareProps(merged));
		const current = this.elementRef.current;
		if (current) for (const cleanAttribute of Object.keys(clean)) {
			const cleanValue = clean[cleanAttribute];
			switch (cleanAttribute) {
				case "ref":
				case "children": break;
				case "style":
					for (const partialStyle of [].concat(clean.style ?? [])) Object.assign(current.style, partialStyle);
					break;
				case "fill":
					if (cleanValue && typeof cleanValue === "object") {
						const value = cleanValue;
						current.setAttribute("fill", convertInt32ColorToRGBA(value.payload));
					}
					break;
				case "stroke":
					if (cleanValue && typeof cleanValue === "object") {
						const value = cleanValue;
						current.setAttribute("stroke", convertInt32ColorToRGBA(value.payload));
					}
					break;
				default: current.setAttribute(getAttributeName(cleanAttribute), cleanValue);
			}
		}
	}
	_remeasureMetricsOnActivation;
	touchableHandleStartShouldSetResponder;
	touchableHandleResponderMove;
	touchableHandleResponderGrant;
	touchableHandleResponderRelease;
	touchableHandleResponderTerminate;
	touchableHandleResponderTerminationRequest;
	constructor(props) {
		super(props);
		if (hasTouchableProperty(props)) SvgTouchableMixin_default(this);
		this._remeasureMetricsOnActivation = remeasure.bind(this);
	}
	render() {
		if (!this.tag) throw new Error("When extending `WebShape` you need to overwrite either `tag` or `render`!");
		this.lastMergedProps = {};
		return unstable_createElement(this.tag, prepare(this, this.prepareProps(this.props)));
	}
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/elements.web.ts
var Circle = class extends WebShape {
	tag = "circle";
};
var ClipPath = class extends WebShape {
	tag = "clipPath";
};
var Defs = class extends WebShape {
	tag = "defs";
};
var Ellipse = class extends WebShape {
	tag = "ellipse";
};
var FeBlend = class extends WebShape {
	tag = "feBlend";
};
var FeColorMatrix = class extends WebShape {
	tag = "feColorMatrix";
};
var FeComponentTransfer = class extends WebShape {
	tag = "feComponentTransfer";
};
var FeComposite = class extends WebShape {
	tag = "feComposite";
};
var FeConvolveMatrix = class extends WebShape {
	tag = "feConvolveMatrix";
};
var FeDiffuseLighting = class extends WebShape {
	tag = "feDiffuseLighting";
};
var FeDisplacementMap = class extends WebShape {
	tag = "feDisplacementMap";
};
var FeDistantLight = class extends WebShape {
	tag = "feDistantLight";
};
var FeDropShadow = class extends WebShape {
	tag = "feDropShadow";
};
var FeFlood = class extends WebShape {
	tag = "feFlood";
};
var FeFuncA = class extends WebShape {
	tag = "feFuncA";
};
var FeFuncB = class extends WebShape {
	tag = "feFuncB";
};
var FeFuncG = class extends WebShape {
	tag = "feFuncG";
};
var FeFuncR = class extends WebShape {
	tag = "feFuncR";
};
var FeGaussianBlur = class extends WebShape {
	tag = "feGaussianBlur";
};
var FeImage = class extends WebShape {
	tag = "feImage";
};
var FeMerge = class extends WebShape {
	tag = "feMerge";
};
var FeMergeNode = class extends WebShape {
	tag = "feMergeNode";
};
var FeMorphology = class extends WebShape {
	tag = "feMorphology";
};
var FeOffset = class extends WebShape {
	tag = "feOffset";
};
var FePointLight = class extends WebShape {
	tag = "fePointLight";
};
var FeSpecularLighting = class extends WebShape {
	tag = "feSpecularLighting";
};
var FeSpotLight = class extends WebShape {
	tag = "feSpotLight";
};
var FeTile = class extends WebShape {
	tag = "feTile";
};
var FeTurbulence = class extends WebShape {
	tag = "feTurbulence";
};
var Filter = class extends WebShape {
	tag = "filter";
};
var ForeignObject = class extends WebShape {
	tag = "foreignObject";
};
var G = class extends WebShape {
	tag = "g";
	prepareProps(props) {
		const { x, y, ...rest } = props;
		if ((x || y) && !rest.translate) rest.translate = `${x || 0}, ${y || 0}`;
		return rest;
	}
};
var Image = class extends WebShape {
	tag = "image";
};
var Line = class extends WebShape {
	tag = "line";
};
var LinearGradient = class extends WebShape {
	tag = "linearGradient";
};
var Marker = class extends WebShape {
	tag = "marker";
};
var Mask = class extends WebShape {
	tag = "mask";
};
var Path = class extends WebShape {
	tag = "path";
};
var Pattern = class extends WebShape {
	tag = "pattern";
};
var Polygon = class extends WebShape {
	tag = "polygon";
};
var Polyline = class extends WebShape {
	tag = "polyline";
};
var RadialGradient = class extends WebShape {
	tag = "radialGradient";
};
var Rect = class extends WebShape {
	tag = "rect";
};
var Stop = class extends WebShape {
	tag = "stop";
};
var Svg = class extends WebShape {
	tag = "svg";
	toDataURL(callback, options = {}) {
		const ref = this.elementRef.current;
		if (ref === null) return;
		const rect = getBoundingClientRect(ref);
		const width = Number(options.width) || rect.width;
		const height = Number(options.height) || rect.height;
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
		svg.setAttribute("width", String(width));
		svg.setAttribute("height", String(height));
		svg.appendChild(ref.cloneNode(true));
		const img = new window.Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			canvas.getContext("2d")?.drawImage(img, 0, 0);
			callback(canvas.toDataURL().replace("data:image/png;base64,", ""));
		};
		img.src = `data:image/svg+xml;utf8,${encodeSvg(new window.XMLSerializer().serializeToString(svg))}`;
	}
};
var Symbol$1 = class extends WebShape {
	tag = "symbol";
};
var TSpan = class extends WebShape {
	tag = "tspan";
};
var Text = class extends WebShape {
	tag = "text";
};
var TextPath = class extends WebShape {
	tag = "textPath";
};
var Use = class extends WebShape {
	tag = "use";
};
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/xmlTags.ts
var tags = {
	circle: Circle,
	clipPath: ClipPath,
	defs: Defs,
	ellipse: Ellipse,
	filter: Filter,
	feBlend: FeBlend,
	feColorMatrix: FeColorMatrix,
	feComponentTransfer: FeComponentTransfer,
	feComposite: FeComposite,
	feConvolveMatrix: FeConvolveMatrix,
	feDiffuseLighting: FeDiffuseLighting,
	feDisplacementMap: FeDisplacementMap,
	feDistantLight: FeDistantLight,
	feDropShadow: FeDropShadow,
	feFlood: FeFlood,
	feGaussianBlur: FeGaussianBlur,
	feImage: FeImage,
	feMerge: FeMerge,
	feMergeNode: FeMergeNode,
	feMorphology: FeMorphology,
	feOffset: FeOffset,
	fePointLight: FePointLight,
	feSpecularLighting: FeSpecularLighting,
	feSpotLight: FeSpotLight,
	feTile: FeTile,
	feTurbulence: FeTurbulence,
	foreignObject: ForeignObject,
	g: G,
	image: Image,
	line: Line,
	linearGradient: LinearGradient,
	marker: Marker,
	mask: Mask,
	path: Path,
	pattern: Pattern,
	polygon: Polygon,
	polyline: Polyline,
	radialGradient: RadialGradient,
	rect: Rect,
	stop: Stop,
	svg: Svg,
	symbol: Symbol$1,
	text: Text,
	textPath: TextPath,
	tspan: TSpan,
	use: Use
};
//#endregion
//#region ../../../../node_modules/.pnpm/react@19.2.3/node_modules/react/cjs/react-jsx-runtime.development.js
/**
* @license React
* react-jsx-runtime.development.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_jsx_runtime_development = /* @__PURE__ */ __commonJSMin(((exports) => {
	(function() {
		function getComponentNameFromType(type) {
			if (null == type) return null;
			if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
			if ("string" === typeof type) return type;
			switch (type) {
				case REACT_FRAGMENT_TYPE: return "Fragment";
				case REACT_PROFILER_TYPE: return "Profiler";
				case REACT_STRICT_MODE_TYPE: return "StrictMode";
				case REACT_SUSPENSE_TYPE: return "Suspense";
				case REACT_SUSPENSE_LIST_TYPE: return "SuspenseList";
				case REACT_ACTIVITY_TYPE: return "Activity";
			}
			if ("object" === typeof type) switch ("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof) {
				case REACT_PORTAL_TYPE: return "Portal";
				case REACT_CONTEXT_TYPE: return type.displayName || "Context";
				case REACT_CONSUMER_TYPE: return (type._context.displayName || "Context") + ".Consumer";
				case REACT_FORWARD_REF_TYPE:
					var innerType = type.render;
					type = type.displayName;
					type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
					return type;
				case REACT_MEMO_TYPE: return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
				case REACT_LAZY_TYPE:
					innerType = type._payload;
					type = type._init;
					try {
						return getComponentNameFromType(type(innerType));
					} catch (x) {}
			}
			return null;
		}
		function testStringCoercion(value) {
			return "" + value;
		}
		function checkKeyStringCoercion(value) {
			try {
				testStringCoercion(value);
				var JSCompiler_inline_result = !1;
			} catch (e) {
				JSCompiler_inline_result = !0;
			}
			if (JSCompiler_inline_result) {
				JSCompiler_inline_result = console;
				var JSCompiler_temp_const = JSCompiler_inline_result.error;
				var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
				JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
				return testStringCoercion(value);
			}
		}
		function getTaskName(type) {
			if (type === REACT_FRAGMENT_TYPE) return "<>";
			if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
			try {
				var name = getComponentNameFromType(type);
				return name ? "<" + name + ">" : "<...>";
			} catch (x) {
				return "<...>";
			}
		}
		function getOwner() {
			var dispatcher = ReactSharedInternals.A;
			return null === dispatcher ? null : dispatcher.getOwner();
		}
		function UnknownOwner() {
			return Error("react-stack-top-frame");
		}
		function hasValidKey(config) {
			if (hasOwnProperty.call(config, "key")) {
				var getter = Object.getOwnPropertyDescriptor(config, "key").get;
				if (getter && getter.isReactWarning) return !1;
			}
			return void 0 !== config.key;
		}
		function defineKeyPropWarningGetter(props, displayName) {
			function warnAboutAccessingKey() {
				specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
			}
			warnAboutAccessingKey.isReactWarning = !0;
			Object.defineProperty(props, "key", {
				get: warnAboutAccessingKey,
				configurable: !0
			});
		}
		function elementRefGetterWithDeprecationWarning() {
			var componentName = getComponentNameFromType(this.type);
			didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
			componentName = this.props.ref;
			return void 0 !== componentName ? componentName : null;
		}
		function ReactElement(type, key, props, owner, debugStack, debugTask) {
			var refProp = props.ref;
			type = {
				$$typeof: REACT_ELEMENT_TYPE,
				type,
				key,
				props,
				_owner: owner
			};
			null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
				enumerable: !1,
				get: elementRefGetterWithDeprecationWarning
			}) : Object.defineProperty(type, "ref", {
				enumerable: !1,
				value: null
			});
			type._store = {};
			Object.defineProperty(type._store, "validated", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: 0
			});
			Object.defineProperty(type, "_debugInfo", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: null
			});
			Object.defineProperty(type, "_debugStack", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: debugStack
			});
			Object.defineProperty(type, "_debugTask", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: debugTask
			});
			Object.freeze && (Object.freeze(type.props), Object.freeze(type));
			return type;
		}
		function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
			var children = config.children;
			if (void 0 !== children) if (isStaticChildren) if (isArrayImpl(children)) {
				for (isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++) validateChildKeys(children[isStaticChildren]);
				Object.freeze && Object.freeze(children);
			} else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
			else validateChildKeys(children);
			if (hasOwnProperty.call(config, "key")) {
				children = getComponentNameFromType(type);
				var keys = Object.keys(config).filter(function(k) {
					return "key" !== k;
				});
				isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
				didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error("A props object containing a \"key\" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />", isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = !0);
			}
			children = null;
			void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
			hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
			if ("key" in config) {
				maybeKey = {};
				for (var propName in config) "key" !== propName && (maybeKey[propName] = config[propName]);
			} else maybeKey = config;
			children && defineKeyPropWarningGetter(maybeKey, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
			return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
		}
		function validateChildKeys(node) {
			isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
		}
		function isValidElement(object) {
			return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
		}
		var React = require_react(), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
			return null;
		};
		React = { react_stack_bottom_frame: function(callStackForError) {
			return callStackForError();
		} };
		var specialPropKeyWarningShown;
		var didWarnAboutElementRef = {};
		var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)();
		var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
		var didWarnAboutKeySpread = {};
		exports.Fragment = REACT_FRAGMENT_TYPE;
		exports.jsx = function(type, config, maybeKey) {
			var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
			return jsxDEVImpl(type, config, maybeKey, !1, trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
		};
		exports.jsxs = function(type, config, maybeKey) {
			var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
			return jsxDEVImpl(type, config, maybeKey, !0, trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
		};
	})();
}));
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/xml.tsx
var import_jsx_runtime = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_react_jsx_runtime_development();
})))();
function missingTag() {
	return null;
}
function SvgAst({ ast, override }) {
	if (!ast) return null;
	const { props, children } = ast;
	const Svg = tags.svg;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, {
		...props,
		...override,
		children
	});
}
var err = console.error.bind(console);
function SvgXml(props) {
	const { onError = err, xml, override, fallback } = props;
	try {
		const ast = (0, import_react.useMemo)(() => xml !== null ? parse(xml) : null, [xml]);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SvgAst, {
			ast,
			override: override || props
		});
	} catch (error) {
		onError(error);
		return fallback ?? null;
	}
}
function SvgUri(props) {
	const { onError = err, uri, onLoad, fallback } = props;
	const [xml, setXml] = (0, import_react.useState)(null);
	const [isError, setIsError] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		uri ? fetchText(uri).then((data) => {
			setXml(data);
			isError && setIsError(false);
			onLoad?.();
		}).catch((e) => {
			onError(e);
			setIsError(true);
		}) : setXml(null);
	}, [
		onError,
		uri,
		onLoad
	]);
	if (isError) return fallback ?? null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SvgXml, {
		xml,
		override: props,
		fallback
	});
}
var SvgFromXml = class extends import_react.Component {
	state = { ast: null };
	componentDidMount() {
		this.parse(this.props.xml);
	}
	componentDidUpdate(prevProps) {
		const { xml } = this.props;
		if (xml !== prevProps.xml) this.parse(xml);
	}
	parse(xml) {
		const { onError = err } = this.props;
		try {
			this.setState({ ast: xml ? parse(xml) : null });
		} catch (e) {
			const error = e;
			onError({
				...error,
				message: `[RNSVG] Couldn't parse SVG, reason: ${error.message}`
			});
		}
	}
	render() {
		const { props, state: { ast } } = this;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SvgAst, {
			ast,
			override: props.override || props
		});
	}
};
var SvgFromUri = class extends import_react.Component {
	state = { xml: null };
	componentDidMount() {
		this.fetch(this.props.uri);
	}
	componentDidUpdate(prevProps) {
		const { uri } = this.props;
		if (uri !== prevProps.uri) this.fetch(uri);
	}
	async fetch(uri) {
		try {
			this.setState({ xml: uri ? await fetchText(uri) : null });
		} catch (e) {
			console.error(e);
		}
	}
	render() {
		const { props, state: { xml } } = this;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SvgFromXml, {
			xml,
			override: props,
			onError: props.onError
		});
	}
};
var upperCase = (_match, letter) => letter.toUpperCase();
var camelCase = (phrase) => phrase.replace(/[:-]([a-z])/g, upperCase);
function getStyle(string) {
	const style = {};
	const declarations = string.split(";").filter((v) => v.trim());
	const { length } = declarations;
	for (let i = 0; i < length; i++) {
		const declaration = declarations[i];
		if (declaration.length !== 0) {
			const split = declaration.split(":");
			const property = split[0];
			const value = split[1];
			style[camelCase(property.trim())] = value.trim();
		}
	}
	return style;
}
function astToReact(value, index) {
	if (typeof value === "object") {
		const { Tag, props, children } = value;
		if (props?.class) {
			props.className = props.class;
			delete props.class;
		}
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, {
			...props,
			children: children.map(astToReact)
		}, index);
	}
	return value;
}
function repeat(str, i) {
	let result = "";
	while (i--) result += str;
	return result;
}
var toSpaces = (tabs) => repeat("  ", tabs.length);
function locate(source, i) {
	const lines = source.split("\n");
	const nLines = lines.length;
	let column = i;
	let line = 0;
	for (; line < nLines; line++) {
		const { length } = lines[line];
		if (column >= length) column -= length;
		else break;
	}
	const before = source.slice(0, i).replace(/^\t+/, toSpaces);
	const beforeExec = /(^|\n).*$/.exec(before);
	const beforeLine = beforeExec && beforeExec[0] || "";
	const after = source.slice(i);
	const afterExec = /.*(\n|$)/.exec(after);
	const snippet = `${beforeLine}${afterExec && afterExec[0]}\n${repeat(" ", beforeLine.length)}^`;
	return {
		line,
		column,
		snippet
	};
}
var validNameCharacters = /[a-zA-Z0-9:_-]/;
var commentStart = /<!--/;
var whitespace = /[\s\t\r\n]/;
var quotemarks = /['"]/;
function parse(source, middleware) {
	const length = source.length;
	let currentElement = null;
	let state = metadata;
	let children = null;
	let root;
	const stack = [];
	function error(message) {
		const { line, column, snippet } = locate(source, i);
		throw new Error(`${message} (${line}:${column}). If this is valid SVG, it's probably a bug. Please raise an issue\n\n${snippet}`);
	}
	function metadata() {
		while (i + 1 < length && (source[i] !== "<" || !(validNameCharacters.test(source[i + 1]) || commentStart.test(source.slice(i, i + 4))))) i++;
		return neutral();
	}
	function neutral() {
		let text = "";
		let char;
		while (i < length && (char = source[i]) !== "<") {
			text += char;
			i += 1;
		}
		if (/\S/.test(text)) children.push(text);
		if (source[i] === "<") return openingTag;
		return neutral;
	}
	function openingTag() {
		const char = source[i];
		if (char === "?") return neutral;
		if (char === "!") {
			const start = i + 1;
			if (source.slice(start, i + 3) === "--") return comment;
			const end = i + 8;
			if (source.slice(start, end) === "[CDATA[") return cdata;
			if (/doctype/i.test(source.slice(start, end))) return doctype;
		}
		if (char === "/") return closingTag;
		const tag = getName();
		const props = {};
		const element = {
			tag,
			props,
			children: [],
			parent: currentElement,
			Tag: tags[tag] || missingTag
		};
		if (currentElement) children.push(element);
		else root = element;
		getAttributes(props);
		const { style } = props;
		if (typeof style === "string") {
			element.styles = style;
			props.style = getStyle(style);
		}
		let selfClosing = false;
		if (source[i] === "/") {
			i += 1;
			selfClosing = true;
		}
		if (source[i] !== ">") error("Expected >");
		if (!selfClosing) {
			currentElement = element;
			({children} = element);
			stack.push(element);
		}
		return neutral;
	}
	function comment() {
		const index = source.indexOf("-->", i);
		if (!~index) error("expected -->");
		i = index + 2;
		return neutral;
	}
	function cdata() {
		const index = source.indexOf("]]>", i);
		if (!~index) error("expected ]]>");
		children.push(source.slice(i + 7, index));
		i = index + 2;
		return neutral;
	}
	function doctype() {
		const index = source.indexOf(">", i);
		if (index === -1) error("expected >");
		i = index;
		return neutral;
	}
	function closingTag() {
		const tag = getName();
		if (!tag) error("Expected tag name");
		if (currentElement && tag !== currentElement.tag) error(`Expected closing tag </${tag}> to match opening tag <${currentElement.tag}>`);
		allowSpaces();
		if (source[i] !== ">") error("Expected >");
		stack.pop();
		currentElement = stack[stack.length - 1];
		if (currentElement) ({children} = currentElement);
		return neutral;
	}
	function getName() {
		let name = "";
		let char;
		while (i < length && validNameCharacters.test(char = source[i])) {
			name += char;
			i += 1;
		}
		return name;
	}
	function getAttributes(props) {
		while (i < length) {
			if (!whitespace.test(source[i])) return;
			allowSpaces();
			const name = getName();
			if (!name) return;
			let value = true;
			allowSpaces();
			if (source[i] === "=") {
				i += 1;
				allowSpaces();
				value = getAttributeValue();
				if (name !== "id" && !isNaN(+value) && value.trim() !== "") value = +value;
			}
			props[camelCase(name)] = value;
		}
	}
	function getAttributeValue() {
		return quotemarks.test(source[i]) ? getQuotedAttributeValue() : getUnquotedAttributeValue();
	}
	function getUnquotedAttributeValue() {
		let value = "";
		do {
			const char = source[i];
			if (char === " " || char === ">" || char === "/") return value;
			value += char;
			i += 1;
		} while (i < length);
		return value;
	}
	function getQuotedAttributeValue() {
		const quotemark = source[i++];
		let value = "";
		let escaped = false;
		while (i < length) {
			const char = source[i++];
			if (char === quotemark && !escaped) return value;
			if (char === "\\" && !escaped) escaped = true;
			value += escaped ? `\\${char}` : char;
			escaped = false;
		}
		return value;
	}
	function allowSpaces() {
		while (i < length && whitespace.test(source[i])) i += 1;
	}
	let i = 0;
	while (i < length) {
		if (!state) error("Unexpected character");
		state = state();
		i += 1;
	}
	if (state !== neutral) error("Unexpected end of input");
	if (root) {
		const xml = (middleware ? middleware(root) : root) || root;
		const ast = xml.children.map(astToReact);
		const jsx = xml;
		jsx.children = ast;
		return jsx;
	}
	return null;
}
//#endregion
//#region ../../../../node_modules/.pnpm/react-native-svg@15.15.4_re_dfe37c98cbfb320c3a2849f8b3b2dc8f/node_modules/react-native-svg/src/deprecated.tsx
function showErrorCSS(name, type) {
	throw Error(`[react-native-svg] You are trying to import a ${type} \`${name}\` that has been moved to a sub-package. Change your import from \`react-native-svg\` to \`react-native-svg/css\`.`);
}
function SvgCss() {
	showErrorCSS("SvgCss", "component");
}
function SvgCssUri() {
	showErrorCSS("SvgCssUri", "component");
}
function SvgWithCss() {
	showErrorCSS("SvgWithCss", "component");
}
function SvgWithCssUri() {
	showErrorCSS("SvgWithCssUri", "component");
}
function inlineStyles() {
	showErrorCSS("inlineStyles", "function");
}
function LocalSvg() {
	showErrorCSS("LocalSvg", "component");
}
function WithLocalSvg() {
	showErrorCSS("WithLocalSvg", "component");
}
function loadLocalRawResource() {
	showErrorCSS("loadLocalRawResource", "function");
}
//#endregion
export { Circle, ClipPath, Defs, Ellipse, FeBlend, FeColorMatrix, FeComponentTransfer, FeComposite, FeConvolveMatrix, FeDiffuseLighting, FeDisplacementMap, FeDistantLight, FeDropShadow, FeFlood, FeFuncA, FeFuncB, FeFuncG, FeFuncR, FeGaussianBlur, FeImage, FeMerge, FeMergeNode, FeMorphology, FeOffset, FePointLight, FeSpecularLighting, FeSpotLight, FeTile, FeTurbulence, Filter, ForeignObject, G, Image, Line, LinearGradient, LocalSvg, Marker, Mask, Path, Pattern, Polygon, Polyline, RadialGradient, Rect, Stop, Svg, Svg as default, SvgAst, SvgCss, SvgCssUri, SvgFromUri, SvgFromXml, SvgUri, SvgWithCss, SvgWithCssUri, SvgXml, Symbol$1 as Symbol, TSpan, Text, TextPath, Use, WithLocalSvg, camelCase, fetchText, inlineStyles, loadLocalRawResource, parse };

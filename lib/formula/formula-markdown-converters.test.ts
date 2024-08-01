import { getFormulaMarkdown } from "./formula-markdown-converters";

describe('getFormulaMarkdown', () => {
  test('returns correct Markdown with formula only', () => {
    const formula = "SUM(A1:A10)";
    const result = getFormulaMarkdown(formula);
    expect(result).toBe("=SUM(A1:A10)");
  });

  test('returns correct Markdown with formula and single-line output', () => {
    const formula = "AVERAGE(B1:B5)";
    const output = "15.5";
    const result = getFormulaMarkdown(formula, output);
    expect(result).toBe("=AVERAGE(B1:B5) |||result:\n 15.5\n|||");
  });

  test('returns correct Markdown with formula and multi-line output', () => {
    const formula = "VLOOKUP(C1, A1:B10, 2, FALSE)";
    const output = "First line\nSecond line\nThird line";
    const result = getFormulaMarkdown(formula, output);
    expect(result).toBe("=VLOOKUP(C1, A1:B10, 2, FALSE) |||result:\n First line\nSecond line\nThird line\n|||");
  });

  test('handles empty output correctly', () => {
    const formula = "IF(D1>100, 'High', 'Low')";
    const output = "";
    const result = getFormulaMarkdown(formula, output);
    expect(result).toBe("=IF(D1>100, 'High', 'Low')");
  });

  test('removes extra newlines from output', () => {
    const formula = "COUNT(E1:E20)";
    const output = "Line 1\n\n\nLine 2\n\nLine 3";
    const result = getFormulaMarkdown(formula, output);
    expect(result).toBe("=COUNT(E1:E20) |||result:\n Line 1\nLine 2\nLine 3\n|||");
  });
});
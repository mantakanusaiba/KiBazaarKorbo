export function toBnDigits(value = "") {
    return String(value).replace(/[0-9]/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
}

export function bnNum(value, fractionDigits = null) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "০";

    const options =
        fractionDigits === null
            ? {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }
            : {
                minimumFractionDigits: fractionDigits,
                maximumFractionDigits: fractionDigits,
            };

    const englishFormatted = new Intl.NumberFormat("en-US", options).format(n);

    return toBnDigits(englishFormatted);
}

export function bnTk(value, fractionDigits = 0) {
    return `৳${bnNum(value, fractionDigits)}`;
}

export function bnPct(value, fractionDigits = 1) {
    return `${bnNum(value, fractionDigits)}%`;
}

export function localizeNumbers(text = "") {
    return toBnDigits(text);
}

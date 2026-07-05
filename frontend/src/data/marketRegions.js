export const DIVISIONS = [
    {
        id: "dhaka",
        name: "ঢাকা",
        markets: [
            { key: "kawran_bazar", label: "কারওয়ান বাজার" },
            { key: "mirpur_1_bazar", label: "মিরপুর ১ বাজার" },
            { key: "mohammadpur_krishi_market", label: "মোহাম্মদপুর কৃষি মার্কেট" },
            { key: "narayanganj_sadar_bajar", label: "নারায়ণগঞ্জ সদর বাজার" },
            { key: "norshingdi_sadar_bajar", label: "নরসিংদী সদর বাজার" },
            { key: "manikganj_bajar", label: "মানিকগঞ্জ বাজার" },
            { key: "munshiganj_sadar_bajar", label: "মুন্সিগঞ্জ সদর বাজার" },
            { key: "tangail_bajar", label: "টাঙ্গাইল বাজার" },
            { key: "kishorganj_bajar", label: "কিশোরগঞ্জ বাজার" },
            { key: "faridpur_sadar_bajar", label: "ফরিদপুর সদর বাজার" },
            { key: "rajbari_sadar_bajar", label: "রাজবাড়ী সদর বাজার" },
            { key: "madaripur_sadar_bajar", label: "মাদারীপুর সদর বাজার" },
            { key: "shariyatpur_sadar_bajar", label: "শরীয়তপুর সদর বাজার" },
            { key: "gopalganj_sadar_borobajar", label: "গোপালগঞ্জ বড় বাজার" },
        ],
    },
    {
        id: "chittagong",
        name: "চট্টগ্রাম",
        markets: [
            { key: "chittagong_sadar_bazar", label: "চট্টগ্রাম সদর বাজার" },
            { key: "cox_bazar_sadar_bajar", label: "কক্সবাজার সদর বাজার" },
            { key: "feni_sadar_bajar", label: "ফেনী সদর বাজার" },
            { key: "noakhali_sadar_bajar", label: "নোয়াখালী সদর বাজার" },
            { key: "lakshmipur_sadar_bajar", label: "লক্ষ্মীপুর সদর বাজার" },
        ],
    },
    {
        id: "rajshahi",
        name: "রাজশাহী",
        markets: [
            { key: "rajshahi_sadar_bazar", label: "রাজশাহী সদর বাজার" },
        ],
    },
    {
        id: "rangpur",
        name: "রংপুর",
        markets: [
            { key: "rangpur_city_bazar", label: "রংপুর সিটি বাজার" },
        ],
    },
];

// market key -> { divisionId, label }
export const MARKET_INFO = DIVISIONS.reduce((acc, div) => {
    div.markets.forEach((m) => {
        acc[m.key] = { divisionId: div.id, divisionName: div.name, label: m.label };
    });
    return acc;
}, {});

export const marketLabel = (key) => MARKET_INFO[key]?.label || key;

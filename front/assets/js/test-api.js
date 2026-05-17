import { saveTestResult } from "/assets/js/api.js";

export function saveTest(data) {
    const token = localStorage.getItem("token");

    if (!token) return;

    const testData = {
        result: data.result || data.resultType || "",
        bouquetTitle: data.bouquetTitle || data.bouquet_title || data.title || "",
        bouquetImage: data.bouquetImage || data.bouquet_image || data.image || data.img || "",
        price: data.price || 0
    };

    saveTestResult(testData)
        .then(res => console.log("Saved:", res))
        .catch(err => console.error("Save test error:", err));
}
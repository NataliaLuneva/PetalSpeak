import { saveTestResult } from "/assets/js/api.js";

// Prepares and sends test result data to the server.

export function saveTest(data) {

    // Normalize field names from different data sources.

    const testData = {
        result: data.result || data.resultType || "",
        bouquetTitle: data.bouquetTitle || data.bouquet_title || data.title || "",
        bouquetImage: data.bouquetImage || data.bouquet_image || data.image || data.img || "",
        price: data.price || 0
    };

    // Save the test result and log the outcome.
    
    saveTestResult(testData)
        .then(res => console.log("Saved:", res))
        .catch(err => console.error("Save test error:", err));
}
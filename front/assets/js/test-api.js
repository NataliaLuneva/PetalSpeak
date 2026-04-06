import { saveTestResult } from "/assets/js/api.js";

export function saveTest(data) {
    if (!localStorage.getItem("token")) return;

    saveTestResult(data)
        .then(res => console.log("Saved:", res))
        .catch(err => console.error("Save test error:", err));
}
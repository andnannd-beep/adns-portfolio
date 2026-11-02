// =====================================
// ADN'S PORTFOLIO - PDF PERSISTENCE
// Save uploaded PDFs in IndexedDB
// =====================================

const DB_NAME = "adnPortfolioDB";
const STORE_NAME = "projectPDFs";
const DB_VERSION = 1;

// Open IndexedDB
function openPDFDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

// Save PDF to IndexedDB
async function savePDF(id, file) {
  const db = await openPDFDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.put({
      id: id,
      name: file.name,
      type: file.type || "application/pdf",
      file: file,
      savedAt: new Date().toISOString()
    });

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// Get saved PDF from IndexedDB
async function getPDF(id) {
  const db = await openPDFDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

// Delete saved PDF
async function deletePDF(id) {
  const db = await openPDFDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// Display PDF preview
function showPDFPreview(container, pdfData, id) {
  container.innerHTML = "";

  const fileURL = URL.createObjectURL(pdfData.file);

  const fileLink = document.createElement("a");
  fileLink.href = fileURL;
  fileLink.target = "_blank";
  fileLink.rel = "noopener";
  fileLink.textContent = "📄 " + pdfData.name;
  fileLink.className = "saved-pdf-link";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.className = "remove-pdf-button";

  removeButton.addEventListener("click", async () => {
    const confirmed = confirm(
      "Remove this PDF from your portfolio?"
    );

    if (!confirmed) return;

    await deletePDF(id);
    container.innerHTML = "";

    const input = document.querySelector(
      `[data-pdf-target="${id}"]`
    );

    if (input) {
      input.value = "";
    }
  });

  container.appendChild(fileLink);
  container.appendChild(removeButton);
}

// Restore saved PDFs after page refresh
async function restoreSavedPDFs() {
  const inputs = document.querySelectorAll(
    "input[type='file'][data-pdf-target]"
  );

  for (const input of inputs) {
    const id = input.dataset.pdfTarget;
    const container = document.getElementById(id);

    if (!container) continue;

    try {
      const savedPDF = await getPDF(id);

      if (savedPDF) {
        showPDFPreview(container, savedPDF, id);
      }
    } catch (error) {
      console.error("Could not restore PDF:", error);
    }
  }
}

// Handle PDF uploads
function setupPDFUploads() {
  const inputs = document.querySelectorAll(
    "input[type='file'][data-pdf-target]"
  );

  inputs.forEach((input) => {
    input.addEventListener("change", async function () {
      const file = this.files[0];
      const id = this.dataset.pdfTarget;
      const container = document.getElementById(id);

      if (!file || !container) return;

      if (file.type !== "application/pdf" &&
          !file.name.toLowerCase().endsWith(".pdf")) {
        alert("Please select a PDF file.");
        this.value = "";
        return;
      }

      try {
        await savePDF(id, file);

        const savedPDF = await getPDF(id);

        if (savedPDF) {
          showPDFPreview(container, savedPDF, id);
        }
      } catch (error) {
        console.error("Could not save PDF:", error);
        alert(
          "The PDF could not be saved. Please try a smaller file."
        );
      }
    });
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  setupPDFUploads();
  await restoreSavedPDFs();
});
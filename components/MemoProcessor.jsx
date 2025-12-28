// components/MemoProcessor.jsx
// Main app component for processing handwritten memos

import React, { useState } from "react";
import jsPDF from "jspdf";

export default function MemoProcessor() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [editedText, setEditedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refDocs, setRefDocs] = useState("");
  const [showRefDocs, setShowRefDocs] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) {
      setError("Please upload an image first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target.result.split(",")[1];

        const response = await fetch("/api/process-memo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageBase64: base64Image,
            refDocs: refDocs,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setExtractedText(data.extracted_text);
          setEditedText(data.extracted_text);
        } else {
          setError(data.error || "Failed to process image");
        }
      };
      reader.readAsDataURL(image);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const maxWidth = pageWidth - margin * 2;

    // Title
    pdf.setFontSize(14);
    pdf.text("Digitized Memo", margin, margin + 10);

    // Add date
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, margin + 18);

    // Content
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(editedText, maxWidth);
    pdf.text(lines, margin, margin + 25);

    pdf.save("memo.pdf");
  };

  const downloadAsText = () => {
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(editedText)
    );
    element.setAttribute("download", "memo.txt");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Handwritten Memo Digitizer</h1>

      {/* Reference Documents Section */}
      <div style={styles.section}>
        <button
          onClick={() => setShowRefDocs(!showRefDocs)}
          style={styles.toggleButton}
        >
          {showRefDocs ? "▼" : "▶"} Reference Documents (Vocabulary/Context)
        </button>
        {showRefDocs && (
          <textarea
            placeholder="Paste vocabulary, glossaries, or context docs here to help Claude understand domain-specific terms..."
            value={refDocs}
            onChange={(e) => setRefDocs(e.target.value)}
            style={styles.refDocsInput}
          />
        )}
      </div>

      {/* Upload Section */}
      <div style={styles.section}>
        <label style={styles.uploadLabel}>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={styles.fileInput}
          />
          📸 Click to upload memo image
        </label>
      </div>

      {/* Image Preview & Processing */}
      <div style={styles.row}>
        {imagePreview && (
          <div style={styles.column}>
            <h3>Original Image</h3>
            <img
              src={imagePreview}
              alt="Original memo"
              style={styles.imagePreview}
            />
          </div>
        )}

        {extractedText && (
          <div style={styles.column}>
            <h3>Extracted Text (Read-only)</h3>
            <div style={styles.readOnlyText}>{extractedText}</div>
          </div>
        )}
      </div>

      {/* Processing Button */}
      {imagePreview && !extractedText && (
        <button
          onClick={processImage}
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Processing with Claude Vision..." : "✨ Process Memo"}
        </button>
      )}

      {/* Edit Section */}
      {extractedText && (
        <div style={styles.section}>
          <h3>Edit & Refine (User Edits)</h3>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            style={styles.editInput}
            placeholder="Make any corrections here..."
          />

          <div style={styles.buttonGroup}>
            <button onClick={exportToPDF} style={styles.button}>
              📄 Export as PDF
            </button>
            <button onClick={downloadAsText} style={styles.button}>
              📝 Download as Text
            </button>
          </div>

          {/* Reset Option */}
          <button
            onClick={() => {
              setImage(null);
              setImagePreview(null);
              setExtractedText("");
              setEditedText("");
              setError(null);
            }}
            style={styles.resetButton}
          >
            Process Another Memo
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
  },
  title: {
    textAlign: "center",
    color: "#1f2937",
    marginBottom: "30px",
  },
  section: {
    marginBottom: "20px",
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "6px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  toggleButton: {
    background: "#e5e7eb",
    border: "none",
    padding: "10px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  refDocsInput: {
    width: "100%",
    height: "120px",
    marginTop: "10px",
    padding: "10px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "12px",
  },
  uploadLabel: {
    display: "block",
    padding: "20px",
    border: "2px dashed #3b82f6",
    borderRadius: "6px",
    textAlign: "center",
    cursor: "pointer",
    backgroundColor: "#eff6ff",
    transition: "all 0.2s",
  },
  fileInput: {
    display: "none",
  },
  row: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  column: {
    flex: 1,
    minWidth: "300px",
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "6px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  imagePreview: {
    maxWidth: "100%",
    maxHeight: "400px",
    borderRadius: "4px",
    border: "1px solid #e5e7eb",
  },
  readOnlyText: {
    backgroundColor: "#f3f4f6",
    padding: "12px",
    borderRadius: "4px",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    maxHeight: "400px",
    overflowY: "auto",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  editInput: {
    width: "100%",
    height: "300px",
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontFamily: "system-ui, sans-serif",
    fontSize: "14px",
    lineHeight: "1.6",
    marginBottom: "15px",
  },
  button: {
    backgroundColor: "#3b82f6",
    color: "white",
    padding: "10px 16px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    marginRight: "10px",
    marginBottom: "10px",
  },
  resetButton: {
    backgroundColor: "#ef4444",
    color: "white",
    padding: "8px 12px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
  buttonGroup: {
    marginBottom: "15px",
  },
  error: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: "12px",
    borderRadius: "4px",
    marginTop: "15px",
  },
};

import { useState } from "react";
import { Download, FileText, Table } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import styles from "./StatsExport.module.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface StatsExportProps {
  data: any;
  selectedStory: string;
}

export function StatsExport({ data, selectedStory }: StatsExportProps) {
  const [open, setOpen] = useState(false);

  const scopeLabel = selectedStory === "ALL" 
    ? "All Stories" 
    : data.storyOptions.find((s: any) => s.id === selectedStory)?.title || "Selected Story";

  const handleCsvExport = () => {
    const rows = [
      ["Scope", scopeLabel],
      ["Export Date", new Date().toLocaleDateString()],
      [],
      ["--- SUMMARY ---"],
      ["Total Views", data.summary.totalViews],
      ["Total Reviews", data.summary.totalReviews],
      ["Average Rating", data.summary.avgRating],
      ["Sentiment", data.summary.sentiment],
      [],
      ["--- STORIES BREAKDOWN ---"],
      ["Title", "Format", "Status", "Views", "Reviews", "Avg Rating"]
    ];

    if (data.storiesTable) {
      data.storiesTable.forEach((s: any) => {
        // Enclose title in quotes to handle commas
        rows.push([
          `"${s.title.replace(/"/g, '""')}"`, 
          s.format, 
          s.status, 
          s.views, 
          s.reviews, 
          s.avgRating
        ]);
      });
    }

    const csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `collabowrite_stats_${new Date().getTime()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setOpen(false);
  };

  const handlePdfExport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("Analytics Report", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Scope: ${scopeLabel}`, 14, 36);

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Summary Metrics", 14, 50);

    autoTable(doc, {
      startY: 55,
      head: [["Metric", "Value"]],
      body: [
        ["Total Views", data.summary.totalViews.toString()],
        ["Total Reviews", data.summary.totalReviews.toString()],
        ["Average Rating", data.summary.avgRating.toString()],
        ["Overall Sentiment", data.summary.sentiment]
      ],
      theme: 'grid',
      headStyles: { fillColor: [225, 112, 85] }
    });

    // Stories Breakdown
    if (data.storiesTable && data.storiesTable.length > 0) {
      const currentY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text("Stories Breakdown", 14, currentY);

      const tableData = data.storiesTable.map((s: any) => [
        s.title,
        s.format,
        s.views.toString(),
        s.reviews.toString(),
        s.avgRating.toString()
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [["Title", "Format", "Views", "Reviews", "Avg Rating"]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [9, 132, 227] }
      });
    }

    doc.save(`collabowrite_stats_${new Date().getTime()}.pdf`);
    setOpen(false);
  };

  return (
    <div className={styles.container}>
      <Button variant="secondary" onClick={() => setOpen(!open)} className={styles.exportBtn}>
        <Download size={18} /> Export Report
      </Button>
      
      {open && (
        <Card className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <p className={styles.dropdownTitle}>Export Format</p>
            <p className={styles.dropdownDesc}>Exporting data for: {scopeLabel}</p>
          </div>
          <div className={styles.optionsList}>
            <button className={styles.optionBtn} onClick={handleCsvExport}>
              <Table size={20} className={styles.optionIcon} />
              <div className={styles.optionText}>
                <strong>CSV Document</strong>
                <span>Raw data for spreadsheets</span>
              </div>
            </button>
            <button className={styles.optionBtn} onClick={handlePdfExport}>
              <FileText size={20} className={styles.optionIcon} />
              <div className={styles.optionText}>
                <strong>PDF Report</strong>
                <span>Formatted summary report</span>
              </div>
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

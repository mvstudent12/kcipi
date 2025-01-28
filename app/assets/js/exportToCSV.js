console.log("connected");

// function exportToCSV(array, filename = "data.csv") {
//   console.log(array[0]);
//   const csvRows = [];

//   // Get the headers (keys of the first object in the array)
//   const headers = Object.keys(array[0]);
//   csvRows.push(headers.join(",")); // Add the header row

//   // Loop through the array and convert each object to a CSV row
//   for (const row of array) {
//     const values = headers.map((header) => {
//       const value = row[header];
//       // Escape any commas, quotes, or newlines in the values
//       return `"${String(value).replace(/"/g, '""')}"`;
//     });
//     csvRows.push(values.join(","));
//   }

//   // Create a Blob object with the CSV data
//   const csvData = new Blob([csvRows.join("\n")], {
//     type: "text/csv;charset=utf-8;",
//   });

//   // Create a download link
//   const link = document.createElement("a");
//   const url = URL.createObjectURL(csvData);
//   link.setAttribute("href", url);
//   link.setAttribute("download", filename);

//   // Trigger the download
//   link.click();

//   // Clean up
//   URL.revokeObjectURL(url);
// }

// Example usage:
// const data = [
//   { name: "Alice", age: 25, job: "Engineer" },
//   { name: "Bob", age: 30, job: "Designer" },
//   { name: "Charlie", age: 35, job: "Manager" },
// ];

// exportToCSV(data);
function exportToCSV(array, filename = "data.csv") {
  if (!array || !array.length) {
    console.error("Array is empty or undefined");
    return;
  }

  const csvRows = [];

  // Helper function to process each row (handles nested arrays/objects)
  const processRow = (row, parentKey = "") => {
    const rowData = {};
    for (const key in row) {
      const value = row[key];

      if (Array.isArray(value)) {
        // Handle nested arrays
        value.forEach((item, index) => {
          if (typeof item === "object") {
            // Flatten objects in the nested array
            Object.entries(item).forEach(([subKey, subValue]) => {
              rowData[`${parentKey}${key}_${index}_${subKey}`] = subValue;
            });
          } else {
            rowData[`${parentKey}${key}_${index}`] = item;
          }
        });
      } else if (typeof value === "object" && value !== null) {
        // Handle nested objects
        Object.entries(value).forEach(([subKey, subValue]) => {
          rowData[`${parentKey}${key}_${subKey}`] = subValue;
        });
      } else {
        // Handle primitive values
        rowData[`${parentKey}${key}`] = value;
      }
    }
    return rowData;
  };

  // Flatten all rows and determine headers
  const flatRows = array.map((row) => processRow(row));
  const headers = Array.from(
    new Set(flatRows.flatMap((row) => Object.keys(row)))
  );
  csvRows.push(headers.join(",")); // Add the header row

  // Add the data rows
  for (const flatRow of flatRows) {
    const values = headers.map((header) => {
      const value = flatRow[header] || "";
      return `"${String(value).replace(/"/g, '""')}"`; // Escape quotes
    });
    csvRows.push(values.join(","));
  }

  // Create a Blob object with the CSV data
  const csvData = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  // Create a download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(csvData);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);

  // Trigger the download
  link.click();

  // Clean up
  URL.revokeObjectURL(url);
}

console.log("connected");

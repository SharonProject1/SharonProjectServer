// Fetch and render the Markdown file
document.addEventListener("DOMContentLoaded", async () => {
    const markdownContentDiv = document.getElementById("markdown-content");

    try {
        // Fetch the Markdown file (adjusted path for views folder)
        const response = await fetch('/README.md');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const markdownText = await response.text();

        // Convert Markdown to HTML using Marked.js
        const htmlContent = marked(markdownText);

        // Inject the converted HTML into the page
        markdownContentDiv.innerHTML = htmlContent;
    } catch (error) {
        console.error('Error fetching the Markdown file:', error);
        markdownContentDiv.innerHTML = `<p style="color: red;">Error loading Markdown content.</p>`;
    }
});
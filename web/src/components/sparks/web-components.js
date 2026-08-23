class SparksCallout extends HTMLElement {
    connectedCallback() {
        const type = this.getAttribute('type') || 'info';
        const title = this.getAttribute('title') || 'Note';
        const content = this.innerHTML;

        // Define styles per type
        const bgColors = {
            info: '#ebf8ff',
            warning: '#fffff0',
            note: '#f7fafc',
            tip: '#f0fff4'
        };
        const borderColors = {
            info: '#3182ce',
            warning: '#d69e2e',
            note: '#718096',
            tip: '#38a169'
        };

        const bgColor = bgColors[type] || bgColors.info;
        const borderColor = borderColors[type] || borderColors.info;

        this.innerHTML = `
      <div class="callout callout-${type}" style="padding: 1rem; border-left: 4px solid ${borderColor}; background: ${bgColor}; margin-bottom: 1rem; border-radius: 0 0.375rem 0.375rem 0;">
        <strong style="display: block; margin-bottom: 0.25rem; text-transform: capitalize; color: #2d3748;">
          ${title}
        </strong>
        <div style="font-size: 0.875rem; color: #4a5568;">
          ${content}
        </div>
      </div>
    `;
    }
}

// Register it once globally
if (typeof window !== 'undefined' && !customElements.get('sparks-callout')) {
    customElements.define('sparks-callout', SparksCallout);
}

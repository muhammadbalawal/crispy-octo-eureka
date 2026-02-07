/**
 * Image processing utility functions
 * Supports client-side image validation, base64 conversion, and metadata extraction
 */

// Supported image formats
export const SUPPORTED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

// Maximum file size (5MB)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Validate image file
 * @param {File} file - Image file
 * @returns {Object} { isValid: boolean, error?: string }
 */
export function validateImage(file) {
  // Check file type
  if (!Object.keys(SUPPORTED_IMAGE_TYPES).includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported image format. Supported formats: ${Object.values(SUPPORTED_IMAGE_TYPES).join(', ')}`
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      isValid: false,
      error: `Image size cannot exceed ${Math.round(MAX_IMAGE_SIZE / 1024 / 1024)}MB`
    };
  }

  return { isValid: true };
}

/**
 * Convert image file to base64
 * @param {File} file - Image file
 * @returns {Promise<string>} Base64 string (without data: prefix)
 */
export function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      // Remove data:image/xxx;base64, prefix and return base64 data
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Get image base64 URL (for preview)
 * @param {File} file - Image file
 * @returns {Promise<string>} Complete data URL
 */
export function getImagePreviewUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error('Failed to preview image'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimension information
 * @param {File} file - Image file
 * @returns {Promise<{width: number, height: number}>} Image dimensions
 */
export function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const dimensions = {
        width: img.width,
        height: img.height
      };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read image dimensions'));
    };

    img.src = url;
  });
}

/**
 * Format file size display
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension
 * @param {File} file - File object
 * @returns {string} Extension
 */
export function getFileExtension(file) {
  return SUPPORTED_IMAGE_TYPES[file.type] || 'unknown';
}

/**
 * Create image object for API call
 * @param {File} file - Image file
 * @returns {Promise<Object>} { data: string, mimeType: string }
 */
export async function createImageObject(file) {
  const validation = validateImage(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    const [base64Data, dimensions] = await Promise.all([
      convertToBase64(file),
      getImageDimensions(file)
    ]);

    return {
      data: base64Data,
      mimeType: file.type,
      dimensions,
      size: file.size,
      name: file.name
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

/**
 * Generate image description prompt
 * @param {string} chartType - Chart type
 * @returns {string} Prompt for image
 */
export function generateImagePrompt(chartType) {
  const chartTypeText = chartType && chartType !== 'auto'
    ? `Please convert the image content into an Excalidraw chart of type ${getChartTypeName(chartType)}.`
    : 'Please analyze the image content and choose an appropriate chart type to convert into an Excalidraw chart.';

  return `${chartTypeText}

Please carefully analyze the following in the image:
1. Text content and labels
2. Graphic elements and structure
3. Processes or connection relationships
4. Layout and hierarchical relationships
5. Data or numerical information

Based on the analysis, create a clear and accurate Excalidraw chart, ensuring:
- All key information from the image is preserved
- An appropriate chart type is used to display the content
- Logical relationships and structure are maintained
- Necessary text descriptions are added

Convert the content in the image to Excalidraw`;
}

/**
 * Get chart type name
 * @param {string} chartType - Chart type code
 * @returns {string} Chart type display name
 */
function getChartTypeName(chartType) {
  const typeNames = {
    flowchart: 'Flowchart',
    mindmap: 'Mind Map',
    orgchart: 'Org Chart',
    sequence: 'Sequence Diagram',
    class: 'UML Class Diagram',
    er: 'ER Diagram',
    gantt: 'Gantt Chart',
    timeline: 'Timeline',
    tree: 'Tree Diagram',
    network: 'Network Topology',
    architecture: 'Architecture Diagram',
    dataflow: 'Data Flow Diagram',
    state: 'State Diagram',
    swimlane: 'Swimlane Diagram',
    concept: 'Concept Map',
    fishbone: 'Fishbone Diagram',
    swot: 'SWOT Analysis',
    pyramid: 'Pyramid Diagram',
    funnel: 'Funnel Diagram',
    venn: 'Venn Diagram',
    matrix: 'Matrix Diagram'
  };

  return typeNames[chartType] || 'Auto';
}

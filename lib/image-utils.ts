/**
 * Converts a File object to a base64 string
 * @param file - The file to convert
 * @returns Promise that resolves to the base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) { reject(new Error('Unable to prepare image')); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let data = canvas.toDataURL('image/webp', 0.82);
        if (data.length > 1900000) data = canvas.toDataURL('image/webp', 0.6);
        if (data.length > 2000000) reject(new Error('This image is too large. Try a smaller image.'));
        else resolve(data);
      };
      image.onerror = () => reject(new Error('Unable to read image'));
      image.src = reader.result as string;
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Validates if a file is a valid image type
 * @param file - The file to validate
 * @returns boolean indicating if the file is a valid image
 */
export function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Validates image file size
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default: 5MB)
 * @returns boolean indicating if the file size is valid
 */
export function isValidImageSize(file: File, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Creates an object URL from a base64 string
 * @param base64String - The base64 string to convert
 * @returns object URL string
 */
export function base64ToObjectUrl(base64String: string): string {
  const byteString = atob(base64String.split(',')[1]);
  const mimeString = base64String.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });
  return URL.createObjectURL(blob);
}

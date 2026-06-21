/**
 * דוחס תמונת base64 על ידי ציור על canvas וייצוא כ-JPEG.
 * רץ לגמרי בדפדפן - בלי שרת.
 *
 * @param {string} base64 - מחרוזת base64 (עם או בלי data URL prefix)
 * @param {number} maxWidth - רוחב מקסימלי בפיקסלים (ברירת מחדל: 1200)
 * @param {number} maxHeight - גובה מקסימלי בפיקסלים (ברירת מחדל: 1200)
 * @param {number} quality - איכות JPEG בין 0 ל-1 (ברירת מחדל: 0.8)
 * @returns {Promise<string>} - base64 דחוס עם prefix data URL
 */
export function compressImage(base64, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // חישוב מידות חדשות תוך שמירת יחס גובה-רוחב
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };

    img.onerror = () => reject(new Error("שגיאה בטעינת התמונה לדחיסה"));

    // תמיכה ב-base64 עם ובלי prefix
    img.src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  });
}

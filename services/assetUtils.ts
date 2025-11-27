export const loadImagesFromFiles = async (files: FileList | File[]): Promise<HTMLImageElement[]> => {
  const fileArray = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  
  const promises = fileArray.map((file) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
    });
  });

  return Promise.all(promises);
};
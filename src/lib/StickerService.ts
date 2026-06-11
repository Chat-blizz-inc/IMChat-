import JSZip from 'jszip';

export interface StickerFile {
  name: string;
  blob: Blob;
}

export const fetchStickersFromUrl = async (stickerPageUrl: string, proxyUrl: string = ''): Promise<StickerFile[]> => {
  const fetchText = async (url: string) => {
    const res = await fetch(proxyUrl + url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.text();
  };

  const parseStickerUrls = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = Array.from(doc.querySelectorAll('.sticker-image, .sticker-pack-items img, img[src*="stickers"]')) as HTMLImageElement[];
    const urls = Array.from(new Set(images.map(img => img.src)))
      .filter(src => src.endsWith('.webp') || src.endsWith('.png') || src.endsWith('.gif') || src.endsWith('.jpg') || src.endsWith('.jpeg'));
    return urls;
  };

  const fetchBlob = async (url: string) => {
    const res = await fetch(proxyUrl + url);
    if (!res.ok) throw new Error('Failed to fetch image data');
    return await res.blob();
  };

  try {
    console.log("Fetching sticker metadata...");
    const html = await fetchText(stickerPageUrl);
    const stickerUrls = parseStickerUrls(html);

    if (stickerUrls.length === 0) {
      throw new Error('No sticker images detected. The page structure might have changed or CORS blocked the request.');
    }

    console.log(`Found ${stickerUrls.length} stickers. Downloading...`);
    const files: StickerFile[] = [];
    for (let i = 0; i < stickerUrls.length; i++) {
      const url = stickerUrls[i];
      try {
        const blob = await fetchBlob(url);
        const ext = blob.type.split('/')[1] || 'webp';
        const filename = `sticker_${i + 1}.${ext}`;
        files.push({ name: filename, blob });
      } catch (err) {
        console.warn(`Failed to fetch sticker at ${url}`, err);
      }
    }

    return files;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const saveStickersToLocalFolder = async (files: StickerFile[]) => {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('FileSystemAccessAPI_Unsupported');
  }
  const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
  const stickerFolderHandle = await dirHandle.getDirectoryHandle('sticker', { create: true });

  for (const file of files) {
    const fileHandle = await stickerFolderHandle.getFileHandle(file.name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file.blob);
    await writable.close();
  }
};

export const downloadStickersAsZip = async (files: StickerFile[], packName: string = "Animated Emoji Chat Stickers") => {
  const zip = new JSZip();
  const folder = zip.folder('sticker');

  if (!folder) throw new Error("Failed to create zip folder");

  const metadata = {
    packName,
    platform: "imchat.im",
    count: files.length,
    exportedAt: new Date().toISOString()
  };
  folder.file("metadata.json", JSON.stringify(metadata, null, 2));

  for (const file of files) {
    folder.file(file.name, file.blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = `${packName.toLowerCase().replace(/\s+/g, '_')}_stickers.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

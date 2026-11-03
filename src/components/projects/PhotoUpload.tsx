import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

interface Props {
  /** Called with a validated, decodable image, or with null when the photo is removed. */
  onPhotoSelected: (file: File | null, image?: HTMLImageElement) => void;
  /** Name of the photo currently loaded; switches the control to its compact form. */
  photoName?: string | null;
  disabled?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function PhotoUpload({ onPhotoSelected, photoName, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  async function handleFile(file?: File) {
    if (!file || disabled) return;
    if (!ALLOWED_TYPES.includes(file.type)) { setError('Please select a JPG, PNG, or WebP image.'); return; }
    if (file.size > MAX_FILE_SIZE) { setError('Maximum file size is 10 MB.'); return; }
    const url = URL.createObjectURL(file);
    const image = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('decode'));
        image.src = url;
      });
    } catch {
      setError('This image could not be read. It may be corrupt or unsupported.');
      return;
    } finally {
      URL.revokeObjectURL(url);
    }
    setError('');
    onPhotoSelected(file, image);
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0]);
    event.target.value = '';
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  };
  const browse = () => inputRef.current?.click();

  return (
    <section className="photo-upload" aria-label="Photo upload">
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleChange} hidden data-testid="image-input" aria-label="Choose a photograph" />

      {!photoName ? (
        <div
          className={dragging ? 'upload-zone upload-zone-active' : 'upload-zone'}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div className="upload-icon" aria-hidden="true">📷</div>
          <h2>Upload your photo</h2>
          <p>Drag and drop your image or browse your files.</p>
          <button type="button" onClick={browse} disabled={disabled}>Choose Photo</button>
          <small>JPG, PNG, WebP · Maximum 10 MB</small>
          <small>Your photo never leaves your device.</small>
        </div>
      ) : (
        <div className="photo-bar">
          <span className="photo-bar-name" title={photoName}>{photoName}</span>
          <div className="photo-actions">
            <button type="button" onClick={browse} disabled={disabled}>Replace Photo</button>
            <button type="button" onClick={() => { setError(''); onPhotoSelected(null); }} disabled={disabled}>Remove Photo</button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="upload-error">{error}</p>}
    </section>
  );
}

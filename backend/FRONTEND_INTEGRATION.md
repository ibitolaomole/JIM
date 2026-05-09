# Frontend Integration Guide (PPT/PDF Upload)

This document explains how the frontend should upload `.pptx` or `.pdf` files to the backend.

## Base URL

Local development backend URL:

- `http://localhost:5000`

If testing from a real phone with Expo, replace `localhost` with your computer's LAN IP, for example:

- `http://192.168.1.20:5000`

## Upload Endpoint

- Method: `POST`
- URL: `/api/ppt/upload`
- Content-Type: `multipart/form-data`
- Form field name: `file`

Full URL example:

- `http://localhost:5000/api/ppt/upload`

## Accepted File Types

- `.pptx`
- `.pdf`

## File Size Limit

- Maximum file size: `25 MB`

## Successful Response

Status code: `201`

Example:

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "originalName": "chapter1.pptx",
    "savedAs": "1778345832651-chapter1.pptx",
    "mimeType": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "size": 245760,
    "storedIn": "C:\\Users\\chisi\\Desktop\\JIM\\backend\\data\\ppt",
    "relativePath": "data/ppt/1778345832651-chapter1.pptx"
  }
}
```

## Error Response

Status code: `400`

Example:

```json
{
  "success": false,
  "message": "Only .pptx and .pdf files are allowed"
}
```

Another possible error:

```json
{
  "success": false,
  "message": "No file uploaded. Send file in form-data field named 'file'."
}
```

## React Native (Expo) Example

```ts
const API_BASE_URL = "http://192.168.1.20:5000"; // use your machine IP on real device

export async function uploadStudyFile(fileUri: string, fileName: string, mimeType: string) {
  const formData = new FormData();

  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType, // e.g. application/pdf or application/vnd.openxmlformats-officedocument.presentationml.presentation
  } as any);

  const response = await fetch(`${API_BASE_URL}/api/ppt/upload`, {
    method: "POST",
    body: formData,
    // Do not set Content-Type manually for multipart/form-data in React Native.
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Upload failed");
  }

  return data;
}
```

## Web (Browser) Example

```ts
export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("http://localhost:5000/api/ppt/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Upload failed");
  }

  return data;
}
```

## cURL Test

```bash
curl.exe -X POST http://localhost:5000/api/ppt/upload -F "file=@C:/path/to/file.pptx"
```

## Common Issues

1. `Network request failed` on phone:
- Use your laptop LAN IP instead of `localhost`.
- Ensure phone and laptop are on the same network.

2. `Only .pptx and .pdf files are allowed`:
- Check extension and MIME type.
- Ensure frontend sends file using field name `file`.

3. `No file uploaded...`:
- Confirm your `FormData` key is exactly `file`.

4. CORS issues on web:
- Backend already has `cors()` enabled.
- Verify your frontend is calling the correct backend URL.

## Storage Location

Uploaded files are saved to:

- `backend/data/ppt`

The backend auto-creates this folder if it does not exist.

# JIM Backend Setup

## Installation

1. **Install dependencies** (already done):
   ```bash
   npm install express cors multer dotenv
   ```

2. **Get your Gemini API Key**:
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
   - Create a new API key
   - Add it to `.env` file:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

3. **Start the server**:
   ```bash
   npm run start-server
   ```
   The server will run on `http://localhost:3000`

## API Endpoints

### Health Check
- **GET** `/api/health` - Check if API is running

### File Processing (Main)
- **POST** `/api/jim` - Upload file and generate questions/story
  - Body: `{ content: "text content", fileName: "filename.txt" }`
  - Response: `{ contentId, questions: [...], story: "..." }`

### Retrieve Generated Content
- **GET** `/api/questions/:contentId` - Get generated questions
- **GET** `/api/story/:contentId` - Get generated story

## Frontend Integration

Update your `upload.tsx` to send requests to the backend:

```javascript
const uploadToBacEnd = async (fileContent, fileName) => {
  try {
    const response = await fetch("http://localhost:3000/api/jim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: fileContent,
        fileName: fileName,
      }),
    });
    
    const data = await response.json();
    return data; // Contains contentId, questions, story
  } catch (error) {
    console.error("Error uploading to backend:", error);
  }
};
```

## File Structure

```
/routes
  - health.js     (health check)
  - jim.js        (main processing routes)
/services
  - gemini.js     (Gemini API integration)
app.js            (Express app setup)
server.js         (Server entry point)
.env              (Environment variables)
```

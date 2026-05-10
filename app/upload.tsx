import { FILE_CONFIG } from '@/config';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import JSZip from 'jszip';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// PptxParser - Expo compatible PPTX parser
interface ParsedSlide {
  id: string;
  path: string;
  xml: string;
  parsed: any;
}

interface SlideTextContent extends ParsedSlide {
  text: string[];
}

interface ParsedPresentation {
  presentation: {
    path: string;
    xml: string;
    parsed: any;
  };
  relationships: {
    path: string;
    xml: string;
    parsed: any;
  };
  slides: ParsedSlide[];
}

class PptxParser {
  private arrayBuffer: ArrayBuffer;

  constructor(arrayBuffer: ArrayBuffer) {
    this.arrayBuffer = arrayBuffer;
  }

  async parse(): Promise<ParsedPresentation> {
    try {
      const zip = new JSZip();
      await zip.loadAsync(this.arrayBuffer);

      // Get presentation.xml
      const presentationXml = await zip.file('ppt/presentation.xml')?.async('text') || '';
      
      // Get relationships
      const relsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('text') || '';

      // Get all slides
      const slides: ParsedSlide[] = [];
      const slidesFolder = zip.folder('ppt/slides');
      
      if (slidesFolder) {
        const slideFiles = Object.keys(slidesFolder.files)
          .filter((file) => file.endsWith('.xml') && !file.includes('_rels'))
          .sort();

        for (let i = 0; i < slideFiles.length; i++) {
          const slideFile = slideFiles[i];
          const xml = await slidesFolder.file(slideFile)?.async('text') || '';
          slides.push({
            id: `slide${i + 1}`,
            path: `ppt/slides/${slideFile}`,
            xml,
            parsed: null,
          });
        }
      }

      return {
        presentation: {
          path: 'ppt/presentation.xml',
          xml: presentationXml,
          parsed: null,
        },
        relationships: {
          path: 'ppt/_rels/presentation.xml.rels',
          xml: relsXml,
          parsed: null,
        },
        slides,
      };
    } catch (error) {
      throw new Error(`Invalid PPTX file structure: ${error}`);
    }
  }

  async extractText(): Promise<SlideTextContent[]> {
    try {
      const zip = new JSZip();
      await zip.loadAsync(this.arrayBuffer);

      const textContent: SlideTextContent[] = [];
      const slidesFolder = zip.folder('ppt/slides');
      
      if (slidesFolder) {
        const slideFiles = Object.keys(slidesFolder.files)
          .filter((file) => file.endsWith('.xml') && !file.includes('_rels'))
          .sort();

        for (let i = 0; i < slideFiles.length; i++) {
          const slideFile = slideFiles[i];
          const xml = await slidesFolder.file(slideFile)?.async('text') || '';
          
          // Extract text using regex
          const textMatches = xml.match(/<a:t>([^<]+)<\/a:t>/g) || [];
          const slideText = textMatches.map((match) =>
            match.replace(/<a:t>|<\/a:t>/g, '')
          );

          textContent.push({
            id: `slide${i + 1}`,
            path: `ppt/slides/${slideFile}`,
            xml,
            parsed: null,
            text: slideText,
          });
        }
      }

      return textContent;
    } catch (error) {
      throw new Error(`File reading error: ${error}`);
    }
  }
}


export default function UploadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const isPanicMode = params.isPanicMode === 'true';

  const extractPowerpointText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const parser = new PptxParser(arrayBuffer);
      const textContent = await parser.extractText();
      
      // Combine all slide text
      return textContent
        .map((slide) => slide.text.join(' '))
        .join('\n');
    } catch (error) {
      console.error('Error extracting PowerPoint:', error);
      return '';
    }
  };

  const pickFile = async () => {
    try {
      setIsLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
            type: FILE_CONFIG.ACCEPTED_TYPES,
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      const file = result.assets[0];

      // Copy the picked file to the app cache directory and pass a fileUri instead of large base64
      let cachedUri = `${FileSystem.cacheDirectory}${file.name}`;
      const copyWithRetry = async (from: string, to: string, attempts = 2) => {
        let lastErr: any = null;
        for (let i = 0; i < attempts; i++) {
          try {
            await FileSystem.copyAsync({ from, to });
            lastErr = null;
            break;
          } catch (err) {
            lastErr = err;
            if (i < attempts - 1) await new Promise((res) => setTimeout(res, 300));
          }
        }
        if (lastErr) throw lastErr;
      };

      try {
        await copyWithRetry(file.uri, cachedUri, 2);
      } catch (e) {
        // If copy fails, fall back to using the original uri
        console.warn('Upload: copy to cache failed after retries, using original uri', e);
        cachedUri = file.uri;
      }

      const info = await FileSystem.getInfoAsync(cachedUri);

      let mimeType = 'text/plain';
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.pptx')) mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      else if (file.name.endsWith('.txt')) mimeType = 'text/plain';

      router.push({
        pathname: isPanicMode ? '/panic-mode' : '/question-count',
        params: {
          fileName: file.name,
          fileUri: cachedUri,
          mimeType: mimeType,
          isPanicMode: isPanicMode ? 'true' : 'false',
        },
      });

      // Diagnostic log: show what we are sending to the next screen
      try {
        console.log('Upload: routing to', isPanicMode ? '/panic-mode' : '/question-count', JSON.stringify({ fileName: file.name, mimeType, fileUri: cachedUri, fileSize: (info as any).size || 0, isPanicMode: isPanicMode ? 'true' : 'false' }));
      } catch (e) {
        /* ignore logging errors */
      }
    } catch (error) {
      console.error('Error picking file:', error);
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Pressable 
        style={styles.backButtonContainer}
        onPress={() => router.back()}
      >
        <ThemedText style={styles.backButton}>← Back</ThemedText>
      </Pressable>
      
      <View style={styles.content}>
        <Pressable 
          style={styles.uploadBox}
          onPress={pickFile}
          onLongPress={() => {
            if (!__DEV__) {
              return;
            }

            const sample = `Introduction to Machine Learning:\nSupervised learning involves training a model on labeled data. Key concepts include overfitting, regularization, and cross-validation. Unsupervised learning focuses on clustering and dimensionality reduction. Neural networks are composed of layers of interconnected neurons that learn representations.`;

            router.push({
              pathname: '/processing',
              params: {
                content: sample,
                fileName: 'SAMPLE.txt',
                mimeType: 'text/plain',
                questionCount: '10',
                isPanicMode: isPanicMode ? 'true' : 'false',
              },
            });
          }}
          delayLongPress={700}
          disabled={isLoading}
        >
          <ThemedText style={styles.uploadText}>
            {isPanicMode 
              ? 'Exam Panic Mode: Upload your files for a rapid-fire quiz session.' 
              : 'Add lecture files and past papers to generate personalised questions.'}
          </ThemedText>
          <ThemedText style={styles.uploadSubtext}>
            {isPanicMode 
              ? 'Focus on weak areas and rapid-fire questions.'
              : 'Supports PowerPoint, PDF, and txt files.'}
          </ThemedText>
          {isLoading && (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 0,
  },
  backButtonContainer: {
    paddingLeft: 16,
    paddingVertical: 70,
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontFamily: 'tt_interphases_pro_regular',
    paddingVertical: -20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 150,
  },
  uploadBox: {
    width: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#f0f8ff',
  },
  
  uploadText: {
    fontSize: 16,
    fontFamily: 'tt_interphases_pro_extrabold',
    color: '#444444',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  loader: {
    marginTop: 16,
  },
});

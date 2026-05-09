import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import JSZip from 'jszip';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
  const [isLoading, setIsLoading] = useState(false);

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
        type: [
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/pdf',
        ],
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      const file = result.assets[0];
      
      // Read file as base64 (React Native compatible)
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
      
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      let extractedText = '';
      if (file.name.endsWith('.pptx')) {
        extractedText = await extractPowerpointText(arrayBuffer);
      } else if (file.name.endsWith('.pdf')) {
        // For PDF, we'd need a PDF parser - for now, just note it
        extractedText = 'PDF content extraction requires additional setup';
      }

      router.push({
        pathname: '/processing',
        params: {
          fileName: file.name,
          content: extractedText,
        },
      });
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
        <View style={styles.uploadBox}>
          <ThemedText style={styles.uploadText}>
            Add lecture files and past papers to generate personalised questions
          </ThemedText>
          <ThemedText style={styles.uploadSubtext}>
            Supports: PowerPoint, PDF, and txt files
          </ThemedText>
        </View>

        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={pickFile}
          disabled={isLoading}
        >
          <ThemedText style={styles.buttonText}>
            {isLoading ? 'Processing...' : 'Select File'}
          </ThemedText>
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
    fontWeight: '600',
    paddingVertical: -20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 40,
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
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

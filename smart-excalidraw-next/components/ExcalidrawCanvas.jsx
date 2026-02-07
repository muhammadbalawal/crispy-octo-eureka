'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo, useRef } from 'react';
import '@excalidraw/excalidraw/index.css';

// Dynamically import Excalidraw with no SSR
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false }
);

// Dynamically import convertToExcalidrawElements
const getConvertFunction = async () => {
  const excalidrawModule = await import('@excalidraw/excalidraw');
  return excalidrawModule.convertToExcalidrawElements;
};

export default function ExcalidrawCanvas({ elements, presentationMode = false }) {
  const [convertToExcalidrawElements, setConvertFunction] = useState(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const prevElementCountRef = useRef(0);

  // Load convert function on mount
  useEffect(() => {
    getConvertFunction().then(fn => {
      setConvertFunction(() => fn);
    });
  }, []);

  // Convert elements to Excalidraw format
  const convertedElements = useMemo(() => {
    if (!elements || elements.length === 0 || !convertToExcalidrawElements) {
      return [];
    }

    try {
      return convertToExcalidrawElements(elements);
    } catch (error) {
      console.error('Failed to convert elements:', error);
      return [];
    }
  }, [elements, convertToExcalidrawElements]);

  // Presentation mode: use updateScene for incremental updates
  useEffect(() => {
    if (!presentationMode || !excalidrawAPI || convertedElements.length === 0) return;

    const prevCount = prevElementCountRef.current;
    prevElementCountRef.current = convertedElements.length;

    // Update scene with all elements (Excalidraw deduplicates by id)
    excalidrawAPI.updateScene({ elements: convertedElements });

    // Pan camera to the new elements only
    const newElements = convertedElements.slice(prevCount);
    if (newElements.length > 0) {
      setTimeout(() => {
        excalidrawAPI.scrollToContent(newElements, {
          fitToContent: true,
          animate: true,
          duration: 500,
        });
      }, 100);
    }
  }, [presentationMode, excalidrawAPI, convertedElements]);

  // Standard mode: auto zoom to fit all content
  useEffect(() => {
    if (presentationMode) return;
    if (excalidrawAPI && convertedElements.length > 0) {
      setTimeout(() => {
        excalidrawAPI.scrollToContent(convertedElements, {
          fitToContent: true,
          animate: true,
          duration: 300,
        });
      }, 100);
    }
  }, [presentationMode, excalidrawAPI, convertedElements]);

  // Reset prev count when leaving presentation mode
  useEffect(() => {
    if (!presentationMode) {
      prevElementCountRef.current = 0;
    }
  }, [presentationMode]);

  // Generate unique key when elements change to force remount (standard mode only)
  const canvasKey = useMemo(() => {
    if (presentationMode) return 'presentation';
    if (convertedElements.length === 0) return 'empty';
    return JSON.stringify(convertedElements.map(el => el.id)).slice(0, 50);
  }, [convertedElements, presentationMode]);

  return (
    <div className="w-full h-full">
      <Excalidraw
        key={canvasKey}
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={{
          elements: presentationMode ? [] : convertedElements,
          appState: {
            viewBackgroundColor: '#ffffff',
            currentItemFontFamily: 1,
          },
          scrollToContent: !presentationMode,
        }}
      />
    </div>
  );
}


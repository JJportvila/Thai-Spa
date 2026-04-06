import { StretProduct } from './productLogic';

/**
 * Stret Voice Module
 * Handles Text-to-Speech (TTS) for the warehouse operations.
 * Supports English, Bislama, and more.
 */

export const speakProductLocation = (product: StretProduct, lang: string = 'en') => {
  if (!window.speechSynthesis) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Convert column number to Letter
  const colLetter = String.fromCharCode(64 + product.colNum);
  let text = '';

  if (lang === 'bi') {
    // Bislama instructions
      const zoneMap: Record<string, string> = {
       'Green': 'GRIN Aria',
       'Red': 'RED Aria',
       'Blue': 'BLU Aria'
     };
    const zoneName = zoneMap[product.zoneColor] || product.zoneColor;
    text = `Yu go long ${zoneName}. Self ${product.shelfId}. Row ${product.rowNum}. Col ${colLetter}.`;
  } else if (lang === 'zh_CN') {
    // Chinese instructions
     const zoneMap: Record<string, string> = {
       'Green': '绿色区域',
       'Red': '红色区域',
       'Blue': '蓝色区域'
     };
    const zoneName = zoneMap[product.zoneColor] || product.zoneColor;
    text = `请前往${zoneName}。货架${product.shelfId}。第 ${product.rowNum} 排。第 ${colLetter} 列。`;
  } else {
    // Default English
    text = `Go to ${product.zoneColor} Area. Shelf ${product.shelfId}. Row ${product.rowNum}. Column ${colLetter}.`;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set language properties for TTS engine
  if (lang === 'zh_CN') {
    utterance.lang = 'zh-CN';
  } else if (lang === 'en') {
    utterance.lang = 'en-US';
  } else {
    // No specific Bislama engine exists in most browsers, 
    // but English US/UK usually works well for Bislama phonetics.
    utterance.lang = 'en-US';
  }

  utterance.pitch = 1.1; // Slightly higher pitch for clarity in noisy warehouse
  utterance.rate = 0.9;  // Slightly slower for better understanding
  
  window.speechSynthesis.speak(utterance);
};

/**
 * Voice Alert for Low Stock or Errors
 */
export const speakAlert = (message: string, lang: string = 'en') => {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = lang === 'zh_CN' ? 'zh-CN' : 'en-US';
  utterance.rate = 1.0;
  utterance.pitch = 1.2;
  window.speechSynthesis.speak(utterance);
};


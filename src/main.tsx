import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import TensorFlow.js and expose as global for MimicRL
import * as tf from '@tensorflow/tfjs';

// Make TensorFlow.js available globally (MimicRL expects it as 'tf')
if (typeof window !== 'undefined') {
  (window as any).tf = tf;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


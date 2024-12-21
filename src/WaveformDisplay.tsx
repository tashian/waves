import React, { useEffect, useRef } from 'react';

const WaveformDisplay = ({ 
  data,
  width = 600,
  height = 200,
  color = '#2563eb',
  backgroundColor = 'white',
  showCenterLine = true,
  centerLineColor = '#94a3b8',
  className = '',
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear and set background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const middleY = height / 2;
    const stepSize = width / data.length;
    const amplitude = 0.9; // Leave a small margin at top and bottom

    // Draw center line if enabled
    if (showCenterLine) {
      ctx.beginPath();
      ctx.strokeStyle = centerLineColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.moveTo(0, middleY);
      ctx.lineTo(width, middleY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    // Draw the waveform path
    data.forEach((sample, index) => {
      const x = index * stepSize;
      const y = middleY + (sample * middleY * amplitude);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Connect back to the start for continuous waveform
    const firstY = middleY + (data[0] * middleY * amplitude);
    ctx.lineTo(width, firstY);
    
    ctx.stroke();
  }, [data, width, height, color, backgroundColor, showCenterLine, centerLineColor]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border rounded"
      />
    </div>
  );
};

export default WaveformDisplay;

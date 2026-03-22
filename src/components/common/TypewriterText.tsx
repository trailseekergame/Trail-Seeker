import React, { useState, useEffect, useRef } from 'react';
import { Text, TouchableWithoutFeedback, TextStyle } from 'react-native';

interface Props {
  text: string;
  speed?: number;
  onComplete?: () => void;
  style?: TextStyle;
}

export default function TypewriterText({ text, speed = 30, onComplete, style }: Props) {
  const [displayedCount, setDisplayedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when text or speed changes
  useEffect(() => {
    setDisplayedCount(0);
    setIsFinished(false);

    intervalRef.current = setInterval(() => {
      setDisplayedCount(prev => {
        const next = prev + 1;
        if (next >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return text.length;
        }
        return next;
      });
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed]);

  // Detect when the full string has been rendered
  useEffect(() => {
    if (displayedCount >= text.length && text.length > 0) {
      setIsFinished(true);
    }
  }, [displayedCount, text.length]);

  // Fire onComplete after render, not during
  useEffect(() => {
    if (isFinished) {
      onComplete?.();
    }
  }, [isFinished]);

  const skipToEnd = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayedCount(text.length);
    // isFinished will flip via the displayedCount effect above,
    // which triggers onComplete via the isFinished effect
  };

  return (
    <TouchableWithoutFeedback onPress={skipToEnd}>
      <Text style={style}>
        {text.slice(0, displayedCount)}
        {displayedCount < text.length ? '\u258C' : ''}
      </Text>
    </TouchableWithoutFeedback>
  );
}

"use client";

import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react';

const MAX_OVERFLOW = 50;

interface ElasticSliderProps {
  value?: number;
  onChange?: (val: number) => void;
  disabled?: boolean;
  defaultValue?: number;
  startingValue?: number; // equivalent to min
  maxValue?: number;      // equivalent to max
  className?: string;
  isStepped?: boolean;
  stepSize?: number;      // equivalent to step
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  activeColor?: string; // hex or tailwind class for the active track fill
  showValueLabel?: boolean;
}

const ElasticSlider: React.FC<ElasticSliderProps> = ({
  value,
  onChange,
  disabled = false,
  defaultValue = 50,
  startingValue = 0,
  maxValue = 100,
  className = '',
  isStepped = false,
  stepSize = 1,
  leftIcon,
  rightIcon,
  activeColor = '#7C3AED',
  showValueLabel = false,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center w-full ${className}`}>
      <Slider
        value={value}
        onChange={onChange}
        disabled={disabled}
        defaultValue={defaultValue}
        startingValue={startingValue}
        maxValue={maxValue}
        isStepped={isStepped}
        stepSize={stepSize}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        activeColor={activeColor}
        showValueLabel={showValueLabel}
      />
    </div>
  );
};

interface SliderProps {
  value?: number;
  onChange?: (val: number) => void;
  disabled: boolean;
  defaultValue: number;
  startingValue: number;
  maxValue: number;
  isStepped: boolean;
  stepSize: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  activeColor: string;
  showValueLabel: boolean;
}

const Slider: React.FC<SliderProps> = ({
  value: controlledValue,
  onChange,
  disabled,
  defaultValue,
  startingValue,
  maxValue,
  isStepped,
  stepSize,
  leftIcon,
  rightIcon,
  activeColor,
  showValueLabel,
}) => {
  const isControlled = controlledValue !== undefined;
  const [localValue, setLocalValue] = useState<number>(defaultValue);
  const currentValue = isControlled ? (controlledValue ?? defaultValue) : localValue;

  const sliderRef = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState<'left' | 'middle' | 'right'>('middle');
  const clientX = useMotionValue(0);
  const overflow = useMotionValue(0);
  const scale = useMotionValue(1);

  const leftX = useTransform(() => (region === 'left' ? -overflow.get() / scale.get() : 0));
  const rightX = useTransform(() => (region === 'right' ? overflow.get() / scale.get() : 0));

  useEffect(() => {
    if (!isControlled) {
      setLocalValue(defaultValue);
    }
  }, [defaultValue, isControlled]);

  useMotionValueEvent(clientX, 'change', (latest: number) => {
    if (sliderRef.current) {
      const { left, right } = sliderRef.current.getBoundingClientRect();
      let newValue: number;
      if (latest < left) {
        setRegion('left');
        newValue = left - latest;
      } else if (latest > right) {
        setRegion('right');
        newValue = latest - right;
      } else {
        setRegion('middle');
        newValue = 0;
      }
      overflow.jump(decay(newValue, MAX_OVERFLOW));
    }
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.buttons > 0 && sliderRef.current) {
      const { left, width } = sliderRef.current.getBoundingClientRect();
      let newValue = startingValue + ((e.clientX - left) / width) * (maxValue - startingValue);
      if (isStepped) {
        newValue = Math.round(newValue / stepSize) * stepSize;
      }
      newValue = Math.min(Math.max(newValue, startingValue), maxValue);
      
      if (!isControlled) {
        setLocalValue(newValue);
      }
      if (onChange) {
        onChange(newValue);
      }
      clientX.jump(e.clientX);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    handlePointerMove(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = () => {
    if (disabled) return;
    animate(overflow, 0, { type: 'spring', bounce: 0.5 });
  };

  const getRangePercentage = (): number => {
    const totalRange = maxValue - startingValue;
    if (totalRange === 0) return 0;
    return ((currentValue - startingValue) / totalRange) * 100;
  };

  return (
    <>
      <motion.div
        onHoverStart={() => !disabled && animate(scale, 1.1)}
        onHoverEnd={() => animate(scale, 1)}
        onTouchStart={() => !disabled && animate(scale, 1.1)}
        onTouchEnd={() => animate(scale, 1)}
        style={{
          scale,
          opacity: useTransform(scale, [1, 1.1], [disabled ? 0.5 : 0.85, 1])
        }}
        className={`flex w-full select-none items-center justify-center gap-3 ${disabled ? 'pointer-events-none opacity-50' : 'touch-none'}`}
      >
        {leftIcon && (
          <motion.div
            animate={{
              scale: region === 'left' ? [1, 1.3, 1] : 1,
              transition: { duration: 0.25 }
            }}
            style={{
              x: leftX
            }}
          >
            {leftIcon}
          </motion.div>
        )}

        <div
          ref={sliderRef}
          className="relative flex w-full flex-grow cursor-grab touch-none select-none items-center py-2.5 nodrag"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
        >
          <motion.div
            style={{
              scaleX: useTransform(() => {
                if (sliderRef.current) {
                  const { width } = sliderRef.current.getBoundingClientRect();
                  return 1 + overflow.get() / width;
                }
                return 1;
              }),
              scaleY: useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.8]),
              transformOrigin: useTransform(() => {
                if (sliderRef.current) {
                  const { left, width } = sliderRef.current.getBoundingClientRect();
                  return clientX.get() < left + width / 2 ? 'right' : 'left';
                }
                return 'center';
              }),
              height: useTransform(scale, [1, 1.1], [6, 8]),
              marginTop: useTransform(scale, [1, 1.1], [0, -1]),
              marginBottom: useTransform(scale, [1, 1.1], [0, -1])
            }}
            className="flex flex-grow"
          >
            <div className="relative h-full flex-grow overflow-hidden rounded-full bg-zinc-800 border border-white/5">
              <div
                className="absolute h-full rounded-full transition-all duration-75"
                style={{
                  width: `${getRangePercentage()}%`,
                  backgroundColor: activeColor,
                }}
              />
            </div>
          </motion.div>
        </div>

        {rightIcon && (
          <motion.div
            animate={{
              scale: region === 'right' ? [1, 1.3, 1] : 1,
              transition: { duration: 0.25 }
            }}
            style={{
              x: rightX
            }}
          >
            {rightIcon}
          </motion.div>
        )}
      </motion.div>
      {showValueLabel && (
        <p className="absolute text-gray-400 transform -translate-y-4 text-xs font-medium tracking-wide">
          {Math.round(currentValue)}
        </p>
      )}
    </>
  );
};

function decay(value: number, max: number): number {
  if (max === 0) {
    return 0;
  }
  const entry = value / max;
  const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);
  return sigmoid * max;
}

export default ElasticSlider;

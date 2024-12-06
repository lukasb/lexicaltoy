import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect, useRef} from 'react';
import {COMMAND_PRIORITY_CRITICAL, KEY_DOWN_COMMAND} from 'lexical';

type Props = {
  sampleSize?: number;
  onStats?: (stats: {
    p50: number;
    p90: number;
    p99: number;
    mean: number;
    count: number;
  }) => void;
};

class TypingBenchmark {
  private measurements: number[] = [];
  private sampleSize: number;

  constructor(sampleSize: number = 10) {
    this.measurements = [];
    this.sampleSize = sampleSize;
  }

  private percentile(sortedArr: number[], p: number): number {
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[index];
  }

  calculateStats() {
    const sorted = [...this.measurements].sort((a, b) => a - b);
    return {
      p50: this.percentile(sorted, 50),
      p90: this.percentile(sorted, 90),
      p99: this.percentile(sorted, 99),
      mean: this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length,
      count: this.measurements.length
    };
  }

  addMeasurement(duration: number): void {
    this.measurements.push(duration);
  }

  shouldEmitStats(): boolean {
    return this.measurements.length % this.sampleSize === 0;
  }
}

export function TypingPerformancePlugin({
  sampleSize = 10,
  onStats
}: Props): null {
  const [editor] = useLexicalComposerContext();
  const benchmarkRef = useRef<TypingBenchmark | null>(null);

  useEffect(() => {
    if (!benchmarkRef.current) {
      benchmarkRef.current = new TypingBenchmark(sampleSize);
    }

    const benchmark = benchmarkRef.current;

    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      () => {
        const start = performance.now();
        
        $onUpdate(() => {
          const duration = performance.now() - start;
          benchmark.addMeasurement(duration);
          
          if (benchmark.shouldEmitStats()) {
            const stats = benchmark.calculateStats();
            
            if (onStats) {
              onStats(stats);
            } else {
              console.log(`
Performance Stats (${stats.count} samples):
p50: ${stats.p50.toFixed(2)}ms
p90: ${stats.p90.toFixed(2)}ms
p99: ${stats.p99.toFixed(2)}ms
mean: ${stats.mean.toFixed(2)}ms
              `);
            }
          }
        });

        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, sampleSize, onStats]);

  return null;
}
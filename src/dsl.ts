export type k6TestOptions = Partial<{
  cloud: { project?: string; name?: string;[key: string]: any };
  thresholds: Record<string, any>;
}>;

export interface k6Test {
  options: k6TestOptions;

  setup?(): any;
  teardown?(data: any): void;
}

export function scenario(config: { vus: number; duration: string }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // no-op
  };
}

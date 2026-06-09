declare module "@barba/core" {
  type BarbaInstance = {
    destroy: () => void;
  };

  type BarbaInitOptions = {
    debug?: boolean;
    prevent?: (data: { href?: string }) => boolean;
    transitions?: Array<{
      name: string;
      leave?: () => Promise<void> | void;
      enter?: () => Promise<void> | void;
    }>;
  };

  const barba: {
    init: (options?: BarbaInitOptions) => BarbaInstance;
  };

  export default barba;
}

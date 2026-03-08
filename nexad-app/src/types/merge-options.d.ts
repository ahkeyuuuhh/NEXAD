declare module 'merge-options' {
  function mergeOptions(...objects: any[]): any;
  namespace mergeOptions {
    function bind(options: any): (...objects: any[]) => any;
  }
  export = mergeOptions;
}

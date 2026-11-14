export function usageExample(name: string, module: string, jsx: string, setup = "", props = "") {
  const stateImport = setup.includes("useState") ? 'import { useState } from "react";\n' : "";
  return `"use client";\n\n${stateImport}import { ${name} } from "@/components/sapienx-motion/${module}";\n\nexport function Example(${props}) {\n${setup ? `  ${setup}\n` : ""}  return ${jsx};\n}`;
}

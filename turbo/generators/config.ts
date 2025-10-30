import type { PlopTypes } from "@turbo/gen";

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("new-package", {
    description: "Scaffold a new package in packages/*",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Package name (e.g. utils):",
        validate: (input: string) =>
          input && input.trim().length > 0 ? true : "Please provide a name",
      },
      {
        type: "input",
        name: "description",
        message: "Description:",
        default: "",
      },
    ],
    actions: () => {
      const dest = "packages/{{kebabCase name}}";
      return [
        {
          type: "addMany",
          destination: dest,
          base: "turbo/generators/templates/new-package",
          templateFiles: "turbo/generators/templates/new-package/**",
          globOptions: { dot: true },
        },
      ];
    },
  });

  plop.setGenerator("nextjs-feature", {
    description: "Scaffold a Next.js App Router feature in apps/web",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Feature name (used for route and component):",
        validate: (input: string) =>
          input && input.trim().length > 0 ? true : "Please provide a name",
      },
      {
        type: "confirm",
        name: "addComponent",
        message: "Add a colocated UI component?",
        default: true,
      },
      {
        type: "confirm",
        name: "addApiRoute",
        message: "Add an API route under /api?",
        default: false,
      },
    ],
    actions: (data) => {
      const actions: PlopTypes.ActionType[] = [];
      // Page route under src/app
      actions.push({
        type: "add",
        path: "apps/web/src/app/{{kebabCase name}}/page.tsx",
        templateFile:
          "turbo/generators/templates/next-feature/page.tsx.hbs",
      });

      // Optional component under src/components
      if ((data as any)?.addComponent) {
        actions.push({
          type: "add",
          path:
            "apps/web/src/components/{{pascalCase name}}/{{pascalCase name}}.tsx",
          templateFile:
            "turbo/generators/templates/next-feature/Component.tsx.hbs",
        });
      }

      // Optional API route under src/app/api
      if ((data as any)?.addApiRoute) {
        actions.push({
          type: "add",
          path: "apps/web/src/app/api/{{kebabCase name}}/route.ts",
          templateFile:
            "turbo/generators/templates/next-feature/route.ts.hbs",
        });
      }

      return actions;
    },
  });
}

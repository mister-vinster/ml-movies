import { Ajv } from "ajv";

const schema = {
  additionalProperties: false,
  properties: {
    mods: {
      items: { type: "string" },
      minItems: 1,
      type: "array",
    },
    movies: {
      items: {
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          image_uri: { type: "string" },
          title: { type: "string" },
          original_title: { type: "string" },
          secondary_key: { type: "string" },
          secondary_value: { type: "string" },
          half: { type: "number" },
          one: { type: "number" },
          one_half: { type: "number" },
          two: { type: "number" },
          two_half: { type: "number" },
          three: { type: "number" },
          three_half: { type: "number" },
          four: { type: "number" },
          four_half: { type: "number" },
          five: { type: "number" },
        },
        required: ["id", "title"],
        type: "object",
      },
      minItems: 1,
      type: "array",
    },
    refs: { additionalProperties: { type: "string" }, type: "object" },
  },
  required: ["mods", "movies"],
  type: "object",
};

const ajv = new Ajv();
export const validate = ajv.compile(schema);

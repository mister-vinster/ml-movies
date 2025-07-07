import { Ajv } from "ajv";

const schema = {
  additionalProperties: false, // This ensures only defined properties are allowed
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
          tertiary_key: { type: "string" }, // tertiary_key
          release_date: { type: "string" }, // release_date
          // Removed: half-star rating properties
          one: { type: "number" },
          two: { type: "number" },
          three: { type: "number" },
          four: { type: "number" },
          five: { type: "number" },
          six: { type: "number" },
          seven: { type: "number" },
          eight: { type: "number" },
          nine: { type: "number" },
          ten: { type: "number" },
          // ADDED: New Recommendation fields
          recommend_yes: { type: "number" },
          recommend_conditional: { type: "number" },
          recommend_no: { type: "number" },
        },
        required: ["id", "title"], // id and title are still required as per IMovie interface
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
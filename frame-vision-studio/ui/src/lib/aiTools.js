/**
 * OpenAI-compatible tool definitions voor de AI Configurator Assistant.
 * Deze tools worden meegegeven aan de API zodat het model function calls kan doen.
 */
export const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_kozijn",
      description: "Create a frame from a template when the user requests a new window, door or frame.",
      parameters: {
        type: "object",
        properties: {
          template: {
            type: "string",
            enum: ["single_turn_tilt", "double_turn_tilt", "sliding_door", "front_door"],
            description: "Frame template: single_turn_tilt (tilt and turn), double_turn_tilt (double), sliding_door or front_door.",
          },
          width: {
            type: "number",
            description: "Width in millimeters (e.g. 900, 1200, 1800, 3000)",
          },
          height: {
            type: "number",
            description: "Height in millimeters (e.g. 1400, 1500, 2100, 2400)",
          },
          sjabloon: {
            type: "string",
            enum: ["standaard-67-meranti", "standaard-67-accoya", "zwaar-78-meranti", "passief-90-meranti", "kunststof-82-veka", "kunststof-88-kommerling", "aluminium-77-reynaers", "aluminium-75-schuco"],
            description: "Section template: timber (standaard-67-meranti by default, standaard-67-accoya, zwaar-78-meranti, passief-90-meranti), uPVC (kunststof-82-veka, kunststof-88-kommerling), aluminum (aluminium-77-reynaers, aluminium-75-schuco).",
          },
        },
        required: ["template", "width", "height"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_dimensions",
      description: "Update the width or height of the current frame.",
      parameters: {
        type: "object",
        properties: {
          width: { type: "number", description: "New width in mm" },
          height: { type: "number", description: "New height in mm" },
        },
        required: ["width", "height"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_column",
      description: "Add a vertical divider at a position in millimeters measured from the left.",
      parameters: {
        type: "object",
        properties: {
          position: { type: "number", description: "Position in mm from the left" },
        },
        required: ["position"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_row",
      description: "Add a horizontal divider at a position in millimeters measured from the top.",
      parameters: {
        type: "object",
        properties: {
          position: { type: "number", description: "Position in mm from the top" },
        },
        required: ["position"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_cell_type",
      description: "Set a cell type (glass, opening window, door, panel, etc.). Cells are indexed from zero, left to right and top to bottom.",
      parameters: {
        type: "object",
        properties: {
          cell_index: { type: "integer", description: "Cell index (zero-based, left to right, top to bottom)" },
          panel_type: {
            type: "string",
            enum: ["fixed_glass", "turn_tilt", "turn", "tilt", "sliding", "door", "panel", "ventilation"],
            description: "Panel type",
          },
          direction: {
            type: "string",
            enum: ["left", "right", "inward", "outward"],
            description: "Opening direction (optional, for windows and doors)",
          },
        },
        required: ["cell_index", "panel_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_colors",
      description: "Set the inside and outside frame colors using RAL codes.",
      parameters: {
        type: "object",
        properties: {
          color_inside: { type: "string", description: "Inside RAL color code (e.g. RAL9010)" },
          color_outside: { type: "string", description: "Outside RAL color code (e.g. RAL7016)" },
        },
        required: ["color_inside", "color_outside"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "duplicate_kozijn",
      description: "Duplicate the current frame with a new mark.",
      parameters: {
        type: "object",
        properties: {
          new_mark: { type: "string", description: "New mark (e.g. K02, K03)" },
        },
        required: ["new_mark"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_thermal",
      description: "Calculate the thermal transmittance (Uw) of the current frame. No parameters are required.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_current_kozijn",
      description: "Get information about the current frame: dimensions, type, cells, colors and sections.",
      parameters: { type: "object", properties: {} },
    },
  },
];

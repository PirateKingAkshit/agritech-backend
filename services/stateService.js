const State = require("../models/stateModel");
const { translateObjectFields } = require("../utils/translateUtil");

const getAllStatesService = async (req, res) => {
  const { language = "en" } = req.query;
  const states = await State.find({}).lean().sort({ name: 1 });

  const fieldsToTranslate = ["name"];
  const translatedStates = await Promise.all(
    states.map(async (state) => {
      return await translateObjectFields(state, fieldsToTranslate, language);
    })
  );

  return translatedStates;
};

module.exports = { getAllStatesService };

const District = require("../models/districtModel");
const { translateObjectFields } = require("../utils/translateUtil");

const getDistrictByStateIdService = async (req, res, stateId) => {
  const { language = "en" } = req.query;
  
  const districts = await District.find({ state: stateId }).populate("state", "name").lean();

  const fieldsToTranslate = ["name","state.name"];
  const translatedDistricts = await Promise.all(
    districts.map(async (district) => {
      return await translateObjectFields(district, fieldsToTranslate, language);
    })
  );

  return translatedDistricts;

};

module.exports = { getDistrictByStateIdService };

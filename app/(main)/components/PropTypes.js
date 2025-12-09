/**
 * Shared PropTypes definitions for type checking
 * Production-ready type definitions for components
 */
import PropTypes from "prop-types";

// Common prop types
export const examPropType = PropTypes.shape({
  _id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  slug: PropTypes.string,
  status: PropTypes.string,
});

export const subjectPropType = PropTypes.shape({
  _id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  slug: PropTypes.string,
  examId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
});

export const unitPropType = PropTypes.shape({
  _id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  slug: PropTypes.string,
  subjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  examId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
});

export const chapterPropType = PropTypes.shape({
  _id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  slug: PropTypes.string,
  unitId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
});

export const topicPropType = PropTypes.shape({
  _id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  slug: PropTypes.string,
  chapterId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
});

export const subtopicPropType = PropTypes.shape({
  _id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  slug: PropTypes.string,
  topicId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  content: PropTypes.string,
});

export const definitionPropType = PropTypes.shape({
  _id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  slug: PropTypes.string,
  subTopicId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  content: PropTypes.string,
});

export const studentPropType = PropTypes.shape({
  _id: PropTypes.string,
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  email: PropTypes.string,
  phoneNumber: PropTypes.string,
  country: PropTypes.string,
  className: PropTypes.string,
  prepared: PropTypes.string,
});

export const formConfigPropType = PropTypes.shape({
  _id: PropTypes.string.isRequired,
  formName: PropTypes.string, // Made optional - formId is used as name
  formId: PropTypes.string.isRequired,
  description: PropTypes.string,
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      fieldId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      label: PropTypes.string,
      placeholder: PropTypes.string,
      required: PropTypes.bool,
      order: PropTypes.number,
    })
  ),
  settings: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    buttonText: PropTypes.string,
    showVerification: PropTypes.bool,
  }),
});

export default {
  examPropType,
  subjectPropType,
  unitPropType,
  chapterPropType,
  topicPropType,
  subtopicPropType,
  definitionPropType,
  studentPropType,
  formConfigPropType,
};


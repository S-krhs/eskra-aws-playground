// In scope: what the media routes accept, validated at the route boundary
// Out of scope: the handling itself, response construction, DB queries
export {
	mediaIdParamSchema,
	mediaListQuerySchema,
} from "@eskra-aws-playground/shared-domains/contracts/media-library-api.js";

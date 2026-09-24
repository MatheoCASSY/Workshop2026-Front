import { CATEGORIES, GRAVITES, STATUTS } from "@/schemas/incident.schema";
import { ROLES, DISPONIBILITES } from "@/schemas/membre";

/**
 * Description OpenAPI 3.1 de l'API CrewDesk.
 *
 * Écrite à la main, volontairement : une génération automatique depuis le code
 * demanderait une dépendance de plus et des décorateurs partout. Ici, un seul
 * fichier lisible, servi tel quel sur /api/openapi et affiché sur /docs.
 *
 * Contrepartie : si tu ajoutes une route, pense à la décrire ici.
 *
 * Les valeurs d'énumération sont importées des schémas Zod plutôt que
 * recopiées : la doc ne peut donc pas se désynchroniser des validations.
 */

const REPONSES_STANDARD = {
  "401": { $ref: "#/components/responses/NonAuthentifie" },
  "403": { $ref: "#/components/responses/Interdit" },
} as const;

export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "API CrewDesk",
    version: "2.0.0",
    description: [
      "Gestion des incidents de la Station Horizon.",
      "",
      "**Authentification.** Toutes les routes sauf `/api/auth/register` vérifient le jeton",
      "à chaque appel : signature, expiration et existence du compte sont revalidées auprès",
      "de Supabase (`lib/garde.ts`). Connecte-toi sur `/login`, le cookie de session suit",
      "automatiquement — y compris depuis le bouton « Try it out » ci-dessous.",
      "",
      "**Droits.** Chaque route indique le droit qu'elle exige. Les droits sont définis une",
      "seule fois dans `lib/permissions.ts`, et rejoués côté Postgres par les policies RLS",
      "(`db/002_rls.sql`) : un contrôle fait uniquement dans l'appli se contournerait en",
      "appelant l'API directement.",
      "",
      "| Rôle | Incidents | Équipage | Compétences |",
      "| --- | --- | --- | --- |",
      "| `admin` | tous, attribue | lecture + édition | lecture + édition |",
      "| `responsable` | tous, attribue | lecture seule | lecture + édition |",
      "| `technicien` | les siens | — | — |",
      "| `observateur` | ceux qu'il a déclarés | — | — |",
      "",
      "« Les siens » = ceux dont il est responsable, plus ceux qu'il a déclarés. Un incident",
      "hors périmètre répond **404** et non 403 : inutile de confirmer l'existence d'un",
      "ticket qu'on n'a pas le droit de voir.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "Cette instance" }],
  tags: [
    { name: "Authentification" },
    { name: "Incidents", description: "Déclaration, consultation, avancement" },
    { name: "Suivi", description: "Commentaires et photos d'un incident" },
    { name: "Équipage", description: "Membres, rôles et disponibilités" },
    { name: "Compétences", description: "Référentiel et habilitations" },
    { name: "Référentiels", description: "Zones et équipements" },
  ],

  components: {
    securitySchemes: {
      // @supabase/ssr range la session dans un cookie nommé d'après la
      // référence du projet, et la découpe en plusieurs morceaux si elle
      // dépasse la taille maximale d'un cookie.
      cookieSession: {
        type: "apiKey",
        in: "cookie",
        name: "sb-<ref-projet>-auth-token",
        description:
          "Posé par /login. Peut être découpé en `...-auth-token.0`, `.1`… si la session est longue.",
      },
    },

    responses: {
      NonAuthentifie: {
        description: "Jeton absent, expiré ou invalide",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Erreur" } },
        },
      },
      Interdit: {
        description: "Authentifié, mais le rôle ne porte pas ce droit",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Erreur" } },
        },
      },
      Introuvable: {
        description:
          "Ressource inexistante — ou hors du périmètre autorisé, ce qui se répond de la même façon",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Erreur" } },
        },
      },
    },

    schemas: {
      Erreur: {
        type: "object",
        properties: {
          error: { type: "string" },
          details: { description: "Précisions de validation, quand il y en a" },
        },
      },

      Membre: {
        type: "object",
        properties: {
          id_membre: { type: "integer" },
          user_id: { type: "string", format: "uuid", nullable: true },
          nom: { type: "string" },
          prenom: { type: "string" },
          role: { type: "string", enum: [...ROLES] },
          statut: { type: "string", enum: ["actif", "inactif"] },
          disponibilite: { type: "string", enum: [...DISPONIBILITES] },
        },
      },

      MembreBref: {
        type: "object",
        description: "Référence courte d'un membre, telle que les jointures la renvoient",
        properties: {
          id_membre: { type: "integer" },
          prenom: { type: "string" },
          nom: { type: "string" },
          role: { type: "string", enum: [...ROLES] },
        },
      },

      Incident: {
        type: "object",
        description:
          "Un incident avec ses libellés joints. Les écrans affichent `zone.nom` et " +
          "`responsable`, pas les clés étrangères brutes.",
        properties: {
          id_incident: { type: "integer" },
          titre: { type: "string" },
          description: { type: "string", nullable: true },
          categorie: { type: "string", enum: [...CATEGORIES] },
          gravite: { type: "string", enum: [...GRAVITES] },
          statut: { type: "string", enum: [...STATUTS] },
          date_creation: { type: "string", format: "date-time" },
          date_modification: { type: "string", format: "date-time" },
          date_resolution: { type: "string", format: "date-time", nullable: true },
          description_resolution: { type: "string", nullable: true },
          temps_passe: { type: "integer", nullable: true, description: "En minutes" },
          materiel_utilise: { type: "string", nullable: true },
          id_membre_declarant: { type: "integer", nullable: true },
          id_membre_responsable: { type: "integer", nullable: true },
          id_zone: { type: "integer", nullable: true },
          id_equipement: { type: "integer", nullable: true },
          zone: {
            type: "object",
            nullable: true,
            properties: { nom: { type: "string" } },
          },
          equipement: {
            type: "object",
            nullable: true,
            properties: { nom: { type: "string" } },
          },
          declarant: { $ref: "#/components/schemas/MembreBref" },
          responsable: { $ref: "#/components/schemas/MembreBref" },
        },
      },

      IncidentCreate: {
        type: "object",
        required: ["titre", "description", "categorie", "gravite", "id_competences"],
        properties: {
          titre: { type: "string", minLength: 1, maxLength: 150 },
          description: { type: "string", minLength: 1, maxLength: 2000 },
          categorie: { type: "string", enum: [...CATEGORIES] },
          gravite: { type: "string", enum: [...GRAVITES] },
          id_zone: { type: "integer", nullable: true },
          id_equipement: { type: "integer", nullable: true },
          id_competences: {
            type: "array",
            minItems: 1,
            items: { type: "integer" },
            description:
              "Compétences requises pour traiter l'incident. Au moins une : sans elles, " +
              "l'attribution ne peut vérifier la qualification de personne.",
          },
        },
      },

      IncidentMaj: {
        type: "object",
        minProperties: 1,
        description:
          "Avancement et compte rendu. Tous les champs sont optionnels, mais un corps " +
          "vide est refusé — il rendrait 200 sans rien modifier.",
        properties: {
          statut: { type: "string", enum: [...STATUTS] },
          description_resolution: { type: "string", maxLength: 5000, nullable: true },
          temps_passe: {
            type: "integer",
            minimum: 0,
            maximum: 10000,
            nullable: true,
            description: "En minutes",
          },
          materiel_utilise: { type: "string", maxLength: 1000, nullable: true },
        },
      },

      Commentaire: {
        type: "object",
        properties: {
          id_commentaire: { type: "integer" },
          id_incident: { type: "integer" },
          texte: { type: "string" },
          date_creation: { type: "string", format: "date-time" },
          auteur: { $ref: "#/components/schemas/MembreBref" },
          photos: {
            type: "array",
            items: { type: "string", format: "uri" },
            description:
              "URLs signées valables 10 minutes. Le bucket est privé : ces URLs changent " +
              "à chaque lecture et ne peuvent pas être mises en cache.",
          },
        },
      },

      Competence: {
        type: "object",
        properties: {
          id_competence: { type: "integer" },
          nom: { type: "string" },
          categorie: { type: "string", enum: [...CATEGORIES] },
          description: { type: "string", nullable: true },
        },
      },

      Habilitation: {
        type: "object",
        description: "Table POSSEDER : quel membre détient quelle compétence, à quel niveau",
        properties: {
          id_membre: { type: "integer" },
          id_competence: { type: "integer" },
          niveau: { type: "integer", minimum: 1, maximum: 5 },
          certification: { type: "string", nullable: true },
          date_expiration: { type: "string", format: "date", nullable: true },
          competence: { $ref: "#/components/schemas/Competence" },
        },
      },

      Zone: {
        type: "object",
        properties: {
          id_zone: { type: "integer" },
          nom: { type: "string" },
          description: { type: "string", nullable: true },
        },
      },

      Equipement: {
        type: "object",
        properties: {
          id_equipement: { type: "integer" },
          nom: { type: "string" },
          type: { type: "string", nullable: true },
          criticite: { type: "string", enum: ["basse", "normale", "haute", "critique"] },
          id_zone: { type: "integer", nullable: true },
        },
      },
    },
  },

  security: [{ cookieSession: [] }],

  paths: {
    // ---------------------------------------------------- Authentification

    "/api/auth/me": {
      get: {
        tags: ["Authentification"],
        summary: "Utilisateur connecté et sa fiche d'équipage",
        responses: {
          "200": {
            description: "Session valide",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    identifiant: { type: "string" },
                    email: { type: "string" },
                    membre: {
                      $ref: "#/components/schemas/Membre",
                      description: "null si le compte n'a pas de fiche d'équipage",
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
        },
      },
    },

    "/api/auth/register": {
      post: {
        tags: ["Authentification"],
        summary: "Créer un compte d'équipage",
        description:
          "Accepte un pseudo ou un email. Un pseudo devient `pseudo@crewdesk.local`, un " +
          "domaine qui n'existe pas : le compte est donc créé déjà confirmé, sans mail de " +
          "vérification.\n\n" +
          "Le rôle attribué est toujours **observateur** — déclarer un incident et suivre " +
          "les siens, rien de plus. Il ne peut pas venir du formulaire, sinon n'importe qui " +
          "s'inscrirait administrateur. C'est à un admin de le faire évoluer ensuite.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["identifiant", "motDePasse"],
                properties: {
                  identifiant: {
                    type: "string",
                    minLength: 3,
                    maxLength: 50,
                    pattern: "^[a-zA-Z0-9._@+-]+$",
                    example: "ferrand",
                  },
                  motDePasse: { type: "string", minLength: 6, maxLength: 72 },
                  nom: { type: "string", maxLength: 100 },
                  prenom: { type: "string", maxLength: 100 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Compte créé" },
          "400": { description: "Identifiant ou mot de passe invalide" },
          "409": { description: "Identifiant déjà pris" },
        },
      },
    },

    "/api/auth/logout": {
      post: {
        tags: ["Authentification"],
        summary: "Ferme la session",
        description:
          "Côté client, la déconnexion efface en plus le cache hors ligne et les pages " +
          "archivées par le service worker : elles portent le nom et le rôle du membre.",
        responses: { "200": { description: "Déconnecté" } },
      },
    },

    "/api/auth/callback": {
      get: {
        tags: ["Authentification"],
        summary: "Retour d'un lien de confirmation Supabase",
        description: "Échange le code contre une session, puis redirige. Pas d'appel direct.",
        security: [],
        responses: { "302": { description: "Redirection vers / ou /login" } },
      },
    },

    // ----------------------------------------------------------- Incidents

    "/api/incidents": {
      get: {
        tags: ["Incidents"],
        summary: "Liste des incidents, filtrée selon le rôle",
        description:
          "Un `admin` ou un `responsable` reçoit toute la file. Un `technicien` ou un " +
          "`observateur` ne reçoit que les incidents dont il est responsable ou déclarant. " +
          "Le filtre est appliqué par la requête **et** par la RLS.",
        responses: {
          "200": {
            description: "Liste, les plus récents d'abord",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Incident" } },
              },
            },
          },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
        },
      },
      post: {
        tags: ["Incidents"],
        summary: "Déclarer un incident",
        description:
          "Ouvert à tous les rôles, y compris `observateur` : c'est son seul droit " +
          "d'écriture. Le déclarant et l'horodatage viennent de la session, jamais du corps " +
          "de la requête.\n\n" +
          "Si l'enregistrement des compétences requises échoue, l'incident créé est " +
          "supprimé : un ticket sans compétence requise serait inattribuable.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/IncidentCreate" } },
          },
        },
        responses: {
          "201": {
            description: "Créé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    incident: { $ref: "#/components/schemas/Incident" },
                  },
                },
              },
            },
          },
          "400": { description: "Corps invalide" },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
          "404": { description: "Aucune fiche d'équipage associée à ce compte" },
        },
      },
    },

    "/api/incidents/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      get: {
        tags: ["Incidents"],
        summary: "Une fiche d'incident",
        responses: {
          "200": {
            description: "La fiche",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Incident" } },
            },
          },
          "400": { description: "Identifiant invalide" },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
          "404": { $ref: "#/components/responses/Introuvable" },
        },
      },
      patch: {
        tags: ["Incidents"],
        summary: "Avancement et compte rendu d'intervention",
        description:
          "Réservé au **responsable du ticket** et à l'encadrement. Le déclarant suit son " +
          "incident et peut le commenter, mais ne clôt pas une intervention qu'il n'a pas " +
          "menée.\n\n" +
          "`date_resolution` se déduit du statut : elle est posée au passage en `resolu`, " +
          "et effacée si l'incident repart en arrière.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/IncidentMaj" } },
          },
        },
        responses: {
          "200": {
            description: "Mis à jour",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Incident" } },
            },
          },
          "400": { description: "Corps invalide" },
          ...REPONSES_STANDARD,
          "404": { $ref: "#/components/responses/Introuvable" },
        },
      },
    },

    "/api/incidents/{id}/status": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      patch: {
        tags: ["Incidents"],
        summary: "Faire avancer le statut, rien d'autre",
        description:
          "Doublon assumé de `PATCH /api/incidents/{id}`, conservé car publié. Applique " +
          "exactement les mêmes règles : deux routes qui répondent à la même question " +
          "doivent répondre pareil, sinon la plus permissive devient la vraie règle.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["statut"],
                properties: {
                  statut: { type: "string", enum: ["assigne", "en_cours", "resolu", "clos"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Statut modifié" },
          "400": { description: "Statut invalide" },
          ...REPONSES_STANDARD,
          "404": { $ref: "#/components/responses/Introuvable" },
        },
      },
    },

    "/api/incidents/{id}/assignee": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      patch: {
        tags: ["Incidents"],
        summary: "Désigner le technicien responsable",
        description:
          "Exige le droit `incidents.attribuer` (`admin` ou `responsable`).\n\n" +
          "Le technicien doit posséder **toutes** les compétences requises par l'incident, " +
          "sinon la requête est refusée en 400.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["technicianId"],
                properties: { technicianId: { type: "integer" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Incident attribué, statut passé à `assigne`" },
          "400": { description: "Le technicien n'a pas toutes les compétences requises" },
          ...REPONSES_STANDARD,
          "404": { description: "Incident ou technicien introuvable" },
        },
      },
    },

    "/api/incidents/{id}/techniciens": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      get: {
        tags: ["Incidents"],
        summary: "Techniciens qualifiés pour cet incident",
        description:
          "Exige le droit `incidents.attribuer` : la liste expose qui possède quelles " +
          "compétences. Un incident sans compétence requise rend tous les techniciens.",
        responses: {
          "200": {
            description: "Liste",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    techniciens: {
                      type: "array",
                      items: { $ref: "#/components/schemas/MembreBref" },
                    },
                  },
                },
              },
            },
          },
          ...REPONSES_STANDARD,
          "404": { description: "Incident introuvable" },
        },
      },
    },

    "/api/incidents/resolus": {
      get: {
        tags: ["Incidents"],
        summary: "Historique des incidents terminés",
        description:
          "Vue de pilotage : exige `incidents.voirTous`. Un technicien retrouve les siens " +
          "sur l'écran « Mon poste ».",
        responses: {
          "200": {
            description: "Incidents `resolu` et `clos`",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Incident" } },
              },
            },
          },
          ...REPONSES_STANDARD,
        },
      },
    },

    // --------------------------------------------------------------- Suivi

    "/api/incidents/{id}/commentaires": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      get: {
        tags: ["Suivi"],
        summary: "Le fil de suivi d'un incident",
        description:
          "Accessible à qui peut voir l'incident. Les chemins de photos sont signés à la " +
          "volée, en une seule requête pour toute la page.",
        responses: {
          "200": {
            description: "Commentaires, du plus ancien au plus récent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    commentaires: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Commentaire" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
          "404": { $ref: "#/components/responses/Introuvable" },
        },
      },
      post: {
        tags: ["Suivi"],
        summary: "Publier un commentaire, avec photos",
        description:
          "Corps en **multipart/form-data** et non en JSON : les fichiers passent tels " +
          "quels, sans le tiers de volume qu'ajouterait un encodage base64.\n\n" +
          "4 photos maximum, 5 Mo chacune, en JPEG, PNG, WebP ou HEIC. Si une photo échoue " +
          "à se déposer, celles déjà envoyées sont retirées : le bucket ne garde pas de " +
          "fichiers orphelins.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["texte"],
                properties: {
                  texte: { type: "string", minLength: 1, maxLength: 5000 },
                  photos: {
                    type: "array",
                    maxItems: 4,
                    items: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Publié",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    commentaire: { $ref: "#/components/schemas/Commentaire" },
                  },
                },
              },
            },
          },
          "400": { description: "Texte vide, format refusé ou photo trop lourde" },
          ...REPONSES_STANDARD,
          "404": { $ref: "#/components/responses/Introuvable" },
        },
      },
    },

    // ----------------------------------------------------------- Équipage

    "/api/membres": {
      get: {
        tags: ["Équipage"],
        summary: "Membres d'équipage",
        description:
          "`membreConnecte` est toujours renvoyé : l'interface en tire le rôle et " +
          "l'identité de l'utilisateur.\n\n" +
          "La liste complète, elle, n'est envoyée qu'avec le droit `equipage.voir`. " +
          "Un technicien ne reçoit que sa propre fiche.",
        responses: {
          "200": {
            description: "Équipage et membre connecté",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    membres: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Membre" },
                    },
                    membreConnecte: { $ref: "#/components/schemas/Membre" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
        },
      },
    },

    "/api/membres/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      patch: {
        tags: ["Équipage"],
        summary: "Modifier un membre (rôle, statut, disponibilité)",
        description:
          "Réservé au rôle `admin`. Un trigger en base (`protege_role`) refuse en plus " +
          "tout changement de rôle par un non-admin, y compris sur sa propre fiche : " +
          "une policy RLS ne sait pas restreindre colonne par colonne.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                minProperties: 1,
                properties: {
                  nom: { type: "string", maxLength: 100 },
                  prenom: { type: "string", maxLength: 100 },
                  role: { type: "string", enum: [...ROLES] },
                  statut: { type: "string", enum: ["actif", "inactif"] },
                  disponibilite: { type: "string", enum: [...DISPONIBILITES] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Membre mis à jour",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Membre" } },
            },
          },
          "400": { description: "Corps invalide" },
          ...REPONSES_STANDARD,
          "404": { description: "Introuvable" },
        },
      },
    },

    // -------------------------------------------------------- Compétences

    "/api/competences": {
      get: {
        tags: ["Compétences"],
        summary: "Référentiel des compétences",
        responses: {
          "200": {
            description: "Liste, par catégorie puis par nom",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Competence" } },
              },
            },
          },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
        },
      },
      post: {
        tags: ["Compétences"],
        summary: "Ajouter une compétence au référentiel",
        description:
          "Exige `competences.editer` (`admin` ou `responsable`).\n\n" +
          "Le formulaire de déclaration ne propose que les compétences de la catégorie " +
          "choisie : une catégorie vide rend les incidents de ce type indéclarables.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nom", "categorie"],
                properties: {
                  nom: { type: "string", minLength: 1, maxLength: 150 },
                  categorie: { type: "string", enum: [...CATEGORIES] },
                  description: { type: "string", maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Créée",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Competence" } },
            },
          },
          "400": { description: "Corps invalide" },
          ...REPONSES_STANDARD,
        },
      },
    },

    "/api/habilitations": {
      get: {
        tags: ["Compétences"],
        summary: "Qui détient quelle compétence",
        description:
          "Avec `competences.voir`, toute la matrice. Sans ce droit, un membre ne reçoit " +
          "que ses propres habilitations — celles qu'affiche l'écran « Mon poste ».",
        responses: {
          "200": {
            description: "Liste",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Habilitation" },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
        },
      },
      post: {
        tags: ["Compétences"],
        summary: "Attribuer une compétence, ou en changer le niveau",
        description:
          "Exige `competences.editer`.\n\n" +
          "C'est un **upsert** : la clé de POSSEDER est `(id_membre, id_competence)`, " +
          "donc attribuer une compétence déjà détenue ne peut vouloir dire qu'une chose — " +
          "la mettre à jour. Deux gestes pour l'utilisateur, une seule route.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id_membre", "id_competence", "niveau"],
                properties: {
                  id_membre: { type: "integer" },
                  id_competence: { type: "integer" },
                  niveau: { type: "integer", minimum: 1, maximum: 5 },
                  certification: { type: "string", maxLength: 200, nullable: true },
                  date_expiration: {
                    type: "string",
                    format: "date",
                    nullable: true,
                    example: "2027-06-30",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Attribuée",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Habilitation" } },
            },
          },
          "400": { description: "Corps invalide" },
          ...REPONSES_STANDARD,
          "404": { description: "Membre ou compétence introuvable" },
        },
      },
      delete: {
        tags: ["Compétences"],
        summary: "Retirer une compétence à un membre",
        description: "Exige `competences.editer`.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id_membre", "id_competence"],
                properties: {
                  id_membre: { type: "integer" },
                  id_competence: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Retirée" },
          "400": { description: "Membre et compétence requis" },
          ...REPONSES_STANDARD,
        },
      },
    },

    // -------------------------------------------------------- Référentiels

    "/api/zones": {
      get: {
        tags: ["Référentiels"],
        summary: "Les lieux de la station",
        responses: {
          "200": {
            description: "Liste",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Zone" } },
              },
            },
          },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
        },
      },
    },

    "/api/equipements": {
      get: {
        tags: ["Référentiels"],
        summary: "Les équipements, rattachés à leur zone",
        responses: {
          "200": {
            description: "Liste",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Equipement" } },
              },
            },
          },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
        },
      },
    },
  },
} as const;

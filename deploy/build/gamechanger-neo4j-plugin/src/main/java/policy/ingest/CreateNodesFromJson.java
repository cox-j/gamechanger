package policy.ingest;

import com.fasterxml.jackson.databind.JsonNode;
import org.neo4j.logging.Log;
import org.neo4j.procedure.*;
import org.neo4j.graphdb.*;
import policy.utils.Util;

import java.util.*;
import java.util.stream.Stream;

import static java.util.Map.entry;
import static java.util.Objects.isNull;
import static policy.utils.JsonUtils.getStringListFromJsonArray;
import static policy.utils.JsonUtils.getStringListFromNestedJsonArray;
import static policy.utils.JsonUtils.loadJson;
import static policy.utils.Util.setProperty;

import java.io.StringWriter;
import java.io.PrintWriter;

public class CreateNodesFromJson {

    private final static String nodesCreatedString = "nodesCreated";
    private final static String propertiesSetString = "propertiesSet";
    private final static String relationshipsCreatedString = "relationshipsCreated";

    // This gives us a log instance that outputs messages to the
    // standard log, normally found under `data/log/console.log`
    @Context
    public Log log;

    @Context
    public GraphDatabaseService db;

    // /**
    //  * This procedure takes in a json string with all the entities to populate neo4j in one call
    //  * @param json The json string of the entities to be ingested
    //  * @return Stream
    //  */
    @Procedure(value = "policy.createASRSTaxonomyNodesFromJson", mode = Mode.WRITE)
    @Description("Takes in a document json and creates the nodes and relationships based on the content.")
    public Stream<Util.Outgoing> createASRSTaxonomyNodesFromJson(@Name("json") String json) {
        try (Transaction tx = db.beginTx())
        {
            Util.Outgoing out = handleCreateASRSTaxonomyNodesFromJson(json, tx, log);
            tx.commit();
            return Stream.of(out);
        } catch (Exception e) {
            throw new RuntimeException("Error creating node from json", e);
        }
    }


    public Util.Outgoing handleCreateASRSTaxonomyNodesFromJson(String json, Transaction tx, Log log) {
        try {
            int nodesCreated = 0;
            int propertiesSet = 0;
            int relationshipsCreated = 0;

            JsonNode jsonNode = loadJson(json, true);

            List<String> taxonomies = getStringListFromJsonArray(jsonNode.get("taxonomies"));
            List<String> text_topics = getStringListFromJsonArray(jsonNode.get("text_topics"));
            List<String> summary_topics = getStringListFromJsonArray(jsonNode.get("summary_topics"));

            List<String> keywords = getStringListFromNestedJsonArray(jsonNode.get("keyw_5"));
            String docId = jsonNode.get("doc_num").asText("");

            for (String taxonomy : taxonomies) {
                String[] taxonomy_split = taxonomy.split("\\|\\|");
                String taxonomy_domain = taxonomy_split[0];
                String taxonomy_value = taxonomy_split[1];

                Node node = tx.findNode(Label.label(taxonomy_domain), taxonomy_domain, taxonomy_value);

                if (isNull(node)) {
                    node = tx.createNode(Util.labels(Collections.singletonList(taxonomy_domain)));
                    nodesCreated++;
                    node.setProperty(taxonomy_domain, taxonomy_value);
                    node.setProperty("name", taxonomy_value);
                }

                Map<String, Integer> taxonomiesOutput = createDocumentNodesAndRelationships(node, docId, tx, log);

                nodesCreated += taxonomiesOutput.get(nodesCreatedString);
                propertiesSet += taxonomiesOutput.get(propertiesSetString);
                relationshipsCreated += taxonomiesOutput.get(relationshipsCreatedString);
            }



            for (String text_topic : text_topics) {

                Node node = tx.findNode(Label.label("TEXT TOPIC"), "TEXT TOPIC", text_topic);

                if (isNull(node)) {
                    node = tx.createNode(Util.labels(Collections.singletonList("TEXT TOPIC")));
                    nodesCreated++;
                    node.setProperty("TEXT TOPIC", text_topic);
                    node.setProperty("name", text_topic);
                }

                Map<String, Integer> textTopicOutput = createDocumentNodesAndRelationships(node, docId, tx, log);

                nodesCreated += textTopicOutput.get(nodesCreatedString);
                propertiesSet += textTopicOutput.get(propertiesSetString);
                relationshipsCreated += textTopicOutput.get(relationshipsCreatedString);
            }


            for (String summary_topic : summary_topics) {

                Node node = tx.findNode(Label.label("SUMMARY TOPIC"), "SUMMARY TOPIC", summary_topic);

                if (isNull(node)) {
                    node = tx.createNode(Util.labels(Collections.singletonList("SUMMARY TOPIC")));
                    nodesCreated++;
                    node.setProperty("SUMMARY TOPIC", summary_topic);
                    node.setProperty("name", summary_topic);
                }

                Map<String, Integer> summaryTopicOutput = createDocumentNodesAndRelationships(node, docId, tx, log);

                nodesCreated += summaryTopicOutput.get(nodesCreatedString);
                propertiesSet += summaryTopicOutput.get(propertiesSetString);
                relationshipsCreated += summaryTopicOutput.get(relationshipsCreatedString);
            }
            
            for (String keyword : keywords) {

                Node node = tx.findNode(Label.label("KEYWORD"), "KEYWORD", keyword);

                if (isNull(node)) {
                    node = tx.createNode(Util.labels(Collections.singletonList("KEYWORD")));
                    nodesCreated++;
                    node.setProperty("KEYWORD", keyword);
                    node.setProperty("name", keyword);
                }

                Map<String, Integer> keywordOutput = createDocumentNodesAndRelationships(node, docId, tx, log);

                nodesCreated += keywordOutput.get(nodesCreatedString);
                propertiesSet += keywordOutput.get(propertiesSetString);
                relationshipsCreated += keywordOutput.get(relationshipsCreatedString);
            }

            return new Util.Outgoing(nodesCreated, relationshipsCreated, propertiesSet);

        } catch (Exception e) {
            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            e.printStackTrace(pw);
            String sStackTrace = sw.toString();
            log.error(String.format("Error parsing json: %s", sStackTrace));
            throw new RuntimeException("Can't parse json", e);
        }
    }


    private Map<String, Integer> createDocumentNodesAndRelationships(Node parentNode, String document, Transaction tx, Log log) {
        Integer nodesCreated = 0;
        Integer propertiesSet = 0;
        Integer relationshipsCreated = 0;


        Node tmp = tx.findNode(Label.label("Document"), "Document", document);
        if (isNull(tmp)) {
            tmp = tx.createNode(Util.labels(Collections.singletonList("Document")));
            tmp.setProperty("Document", document);
            tmp.setProperty("doc_num", document);
            tmp.setProperty("doc_type", "ASRS");
            tmp.setProperty("name", document);
            nodesCreated++;
            propertiesSet++;
        }

        if (Util.createNonDuplicateRelationship(parentNode, tmp, RelationshipType.withName("CONTAINS"), log) != null) {
            relationshipsCreated++;
        }            

        return Map.ofEntries(
            entry(nodesCreatedString, nodesCreated),
            entry(propertiesSetString, propertiesSet),
            entry(relationshipsCreatedString, relationshipsCreated)
        );
    }






   @Procedure(value = "policy.createIMTaxonomyNodesFromJson", mode = Mode.WRITE)
    @Description("Takes in a document json and creates the nodes and relationships based on the content.")
    public Stream<Util.Outgoing> createIMTaxonomyNodesFromJson(@Name("json") String json) {
        try (Transaction tx = db.beginTx())
        {
            Util.Outgoing out = handleCreateIMTaxonomyNodesFromJson(json, tx, log);
            tx.commit();
            return Stream.of(out);
        } catch (Exception e) {
            throw new RuntimeException("Error creating node from json", e);
        }
    }


    public Util.Outgoing handleCreateIMTaxonomyNodesFromJson(String json, Transaction tx, Log log) {
        try {
            int nodesCreated = 0;
            int propertiesSet = 0;
            int relationshipsCreated = 0;

            JsonNode jsonNode = loadJson(json, true);

            List<String> keywords = getStringListFromNestedJsonArray(jsonNode.get("keyw_5"));
            String docId = jsonNode.get("doc_num").asText("");

            
            for (String keyword : keywords) {

                Node node = tx.findNode(Label.label("KEYWORD"), "KEYWORD", keyword);

                if (isNull(node)) {
                    node = tx.createNode(Util.labels(Collections.singletonList("KEYWORD")));
                    nodesCreated++;
                    node.setProperty("KEYWORD", keyword);
                    node.setProperty("name", keyword);
                }

                Map<String, Integer> keywordOutput = createIMDocumentNodesAndRelationships(node, docId, tx, log);

                nodesCreated += keywordOutput.get(nodesCreatedString);
                propertiesSet += keywordOutput.get(propertiesSetString);
                relationshipsCreated += keywordOutput.get(relationshipsCreatedString);
            }

            return new Util.Outgoing(nodesCreated, relationshipsCreated, propertiesSet);

        } catch (Exception e) {
            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            e.printStackTrace(pw);
            String sStackTrace = sw.toString();
            log.error(String.format("Error parsing json: %s", sStackTrace));
            throw new RuntimeException("Can't parse json", e);
        }
    }


    private Map<String, Integer> createIMDocumentNodesAndRelationships(Node parentNode, String document, Transaction tx, Log log) {
        Integer nodesCreated = 0;
        Integer propertiesSet = 0;
        Integer relationshipsCreated = 0;


        Node tmp = tx.findNode(Label.label("Document"), "Document", document);
        if (isNull(tmp)) {
            tmp = tx.createNode(Util.labels(Collections.singletonList("Document")));
            tmp.setProperty("Document", document);
            tmp.setProperty("doc_num", document);
            tmp.setProperty("doc_type", "I&M");
            tmp.setProperty("name", document);
            nodesCreated++;
            propertiesSet++;
        }

        if (Util.createNonDuplicateRelationship(parentNode, tmp, RelationshipType.withName("CONTAINS"), log) != null) {
            relationshipsCreated++;
        }            

        return Map.ofEntries(
            entry(nodesCreatedString, nodesCreated),
            entry(propertiesSetString, propertiesSet),
            entry(relationshipsCreatedString, relationshipsCreated)
        );
    }




    private int setProperties(Node node, Map<String, Object> properties)  {
        if (isNull(node)) return 0;
        int propsSet = 0;
        for (Map.Entry<String, Object> entry : properties.entrySet()) {
            setProperty(node, entry.getKey(), entry.getValue());
            propsSet++;
        }
        return propsSet;
    }
}
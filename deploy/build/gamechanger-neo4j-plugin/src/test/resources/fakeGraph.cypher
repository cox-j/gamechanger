CREATE (doc:Document {doc_id: 'AGO 1976-02.pdf_0', ref_name: 'AGO 1976-02', ref_list: ['Test 1', 'Test 2']})
CREATE (doc2:Document {doc_id: 'Test 1.pdf_0', ref_name: 'Test 1', ref_list: ['Test 1', 'AGO 1976-02']})
CREATE (t:Topic {name: 'test'})
CREATE (e:Entity {name: 'E Test'})

CREATE (doc)-[:REFERENCES]->(doc2)
CREATE (doc2)-[:REFERENCES]->(doc2)
CREATE (doc2)-[:REFERENCES]->(doc)
CREATE (doc)-[:CONTAINS {relevancy: 0.004}]->(t)
CREATE (doc)-[:MENTIONS {count: 1}]->(e)
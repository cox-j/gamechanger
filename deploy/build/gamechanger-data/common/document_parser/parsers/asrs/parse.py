import os
from common.document_parser.lib import (
    pages,
    paragraphs,
    entities,
    topics,
    ref_list,
    abbreviations,
    summary,
    page_rank,
    organizations,
    keywords,
    text_length,
    read_meta,
    write_doc_dict_to_json
)
from . import post_process, init_doc
from common.document_parser.lib.ml_features import (
    add_pagerank_r, add_popscore_r, add_orgs_rs, add_kw_doc_score_r, add_txt_length)

import csv
import json
from hashlib import md5
from datetime import datetime


# def parse(
#     f_name,
#     meta_data=None,
#     ocr_missing_doc=False,
#     num_ocr_threads=2,
#     force_ocr=False,
#     out_dir="./",
# ):


#     ####USE THIS SCRIPT TO MAP IN ALL DATA FIELDS (ENTITIES, SYNOPSIS)
#     with open(str(f_name), 'r', encoding='utf-8-sig') as outfile:
#         reader = csv.DictReader(outfile, delimiter='|')
#         fingerprints = []
        
#         for count, row in enumerate(reader):
#             print("running policy_analyics.parse on", f_name)
#             meta_dict = read_meta.read_metadata(meta_data)
#             doc_dict = init_doc.create_doc_dict_with_meta(meta_dict)

#             init_doc.assign_f_name_fields(f_name, doc_dict)
#             init_doc.assign_other_fields(doc_dict)
#             should_delete = False
            
#             funcs = [ref_list.add_ref_list, entities.extract_entities, topics.extract_topics, keywords.add_keyw_5, abbreviations.add_abbreviations_n, summary.add_summary, add_pagerank_r, add_popscore_r, add_orgs_rs,
#                     add_kw_doc_score_r, add_txt_length, text_length.add_word_count]
#             try:
#                 # doc_obj = pdf_reader.get_fitz_doc_obj(f_name)
#                 # doc_obj.close()
#                 doc_dict["TEXT"] = row["TEXT"] #WAS "TEXT"
#                 pages.handle_pages(None, doc_dict)
#                 paragraphs.handle_paragraphs(doc_dict) ####UPDATE PARSER TO INCORPORATE ALL DATA
#                 doc_dict["filename"] = "ASRS Event ID: {num}".format(num=str(row["ITEM_ID"])) ####
#                 doc_dict["title"] = row["SUMMARY"] ####
#                 doc_dict["doc_type"] = "ASRS"
#                 doc_dict["doc_num"] = str(row["ITEM_ID"])

#                 # for func in funcs:
#                 #     try:
#                 #         func(doc_dict)
#                 #     except Exception as e:
#                 #         print(e)
#                 #         print("Could not run %s on document dict" % func)
#                 # TODO: ADD DATES ?
#                 # doc_dict = dates.process(doc_dict)

#                 # TODO: post process is mostly unnecessary renaming etc that can be refactored into prior steps
#                 doc_dict = post_process.process(doc_dict)

#                 write_doc_dict_to_json.write(out_dir=out_dir, ex_dict=doc_dict)

#             except Exception as e:
#                 print("ERROR in policy_analytics.parse:", e)
#             finally:
#                 if should_delete:
#                     os.remove(f_name)


def parse(
    f_name,
    meta_data=None,
    ocr_missing_doc=False,
    num_ocr_threads=2,
    force_ocr=False,
    out_dir="./",
):


    ####USE THIS SCRIPT TO MAP IN ALL DATA FIELDS (ENTITIES, SYNOPSIS)
    for count,line in enumerate(open(str(f_name), 'r', encoding='utf-8-sig')):
        row = json.loads(line)
        
        print("running policy_analyics.parse on", f_name)
        meta_dict = read_meta.read_metadata(meta_data)
        doc_dict = init_doc.create_doc_dict_with_meta(meta_dict)

        init_doc.assign_f_name_fields(f_name, doc_dict)
        init_doc.assign_other_fields(doc_dict)
        should_delete = False
        
        # funcs = [ref_list.add_ref_list, entities.extract_entities, topics.extract_topics, keywords.add_keyw_5, abbreviations.add_abbreviations_n, summary.add_summary, add_pagerank_r, add_popscore_r, add_orgs_rs,
        #         add_kw_doc_score_r, add_txt_length, text_length.add_word_count]
        try:
            doc_dict["TEXT"] = row["TEXT"] #WAS "TEXT"
            pages.handle_pages(None, doc_dict)
            paragraphs.handle_paragraphs(doc_dict) ####UPDATE PARSER TO INCORPORATE ALL DATA
            doc_dict["filename"] = "ASRS Event ID: {num}".format(num=str(row["ITEM_ID"])) ####
            doc_dict["title"] = row["SUMMARY"] ####
            doc_dict["doc_type"] = "ASRS"
            doc_dict["doc_num"] = str(row["ITEM_ID"])
            doc_dict['taxonomies'] = row['TAXONOMY']
            doc_dict['taxonomies_display'] = '\n'.join(row['TAXONOMY'])
            doc_dict['text_topics'] = row['TEXT_TOPICS']
            doc_dict['summary_topics'] = row['SUMMARY_TOPICS']
            doc_dict['narrative'] = row['TEXT']
            doc_dict['text_topics_display'] = '\n'.join(row['TEXT_TOPICS'])
            doc_dict['summary_topics_display'] = '\n'.join(row['SUMMARY_TOPICS'])
            doc_dict['report_date'] = datetime.utcfromtimestamp(row['DATE']/1000).strftime('%B %Y')

            
            # doc_dict['topics'] = topics.extract_topics(row['TEXT']) ####

            doc_dict = post_process.process(doc_dict)

            write_doc_dict_to_json.write(out_dir=out_dir, ex_dict=doc_dict)

        except Exception as e:
            print("ERROR in parse:", e)
        finally:
            if should_delete:
                os.remove(f_name)
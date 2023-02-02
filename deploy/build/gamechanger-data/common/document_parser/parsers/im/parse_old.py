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
    write_doc_dict_to_json,
    ocr
)
from . import post_process, init_doc
from . import extract_keywords
from common.document_parser.lib.ml_features import (
    add_pagerank_r, add_popscore_r, add_orgs_rs, add_kw_doc_score_r, add_txt_length)

import csv
import json
from hashlib import md5
from datetime import datetime
from pdfminer.converter import PDFPageAggregator
from pdfminer.layout import LAParams, LTFigure, LTTextBox
from pdfminer.pdfdocument import PDFDocument
from pdfminer.pdfinterp import PDFPageInterpreter, PDFResourceManager
from pdfminer.pdfpage import PDFPage, PDFTextExtractionNotAllowed
from pdfminer.pdfparser import PDFParser
import re
import pathlib
# from gamechangerml.src.featurization.keywords.extract_keywords import get_keywords


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


# def parse(
#     f_name,
#     meta_data=None,
#     ocr_missing_doc=False,
#     num_ocr_threads=2,
#     force_ocr=False,
#     out_dir="./",
# ):


#     ####USE THIS SCRIPT TO MAP IN ALL DATA FIELDS (ENTITIES, SYNOPSIS)
#     for count,line in enumerate(open(str(f_name), 'r', encoding='utf-8-sig')):
#         row = json.loads(line)
        
#         print("running policy_analyics.parse on", f_name)
#         meta_dict = read_meta.read_metadata(meta_data)
#         doc_dict = init_doc.create_doc_dict_with_meta(meta_dict)

#         init_doc.assign_f_name_fields(f_name, doc_dict)
#         init_doc.assign_other_fields(doc_dict)
#         should_delete = False
        
#         funcs = [ref_list.add_ref_list, entities.extract_entities, topics.extract_topics, keywords.add_keyw_5, abbreviations.add_abbreviations_n, summary.add_summary, add_pagerank_r, add_popscore_r, add_orgs_rs,
#                 add_kw_doc_score_r, add_txt_length, text_length.add_word_count]
#         try:
#             doc_dict["TEXT"] = row['form'] + '\n\n' + row["notes"]
#             doc_dict["narrative"] = row['notes']
#             doc_dict["title"] = row['form'].lower()

#             pages.handle_pages(None, doc_dict) #RELIES ON PRESENCE OF 'TEXT'
#             paragraphs.handle_paragraphs(doc_dict) ####UPDATE PARSER TO INCORPORATE ALL DATA
            
#             doc_dict["sex"] = row["sex"]
#             doc_dict["doc_type"] = "IM"
#             doc_dict["doc_num"] = str(count)
#             doc_dict["filename"] = str(count)
#             doc_dict["first"] = row["first"]
#             doc_dict["last"] = row["last"]
#             doc_dict["birthdate"] = datetime.utcfromtimestamp(row['birthdate']/1000).strftime('%B %Y')
#             doc_dict['n_family'] = str(row['n_family'])
#             doc_dict['street'] = row['street']
#             doc_dict['city'] = row['city']
#             doc_dict['state'] = row['state']
#             doc_dict['zip'] = str(row['zip'])
#             doc_dict['passport'] = row['passport']
#             doc_dict['residence'] = row['residence']
#             doc_dict['n_countries'] = ', '.join(row["n_countries"])
#             doc_dict['flight'] = row['flight']
#             doc_dict['fruits'] = row['fruits']
#             doc_dict['meats'] = row['meats']
#             doc_dict['disease'] = row['disease']
#             doc_dict['soil'] = row['soil']
#             doc_dict['livestock'] = row['livestock']
#             doc_dict['currency'] = row['currency']
#             doc_dict['merchandise'] = row['merchandise']
#             doc_dict['value'] = str(row['value'])

#             doc_dict = post_process.process(doc_dict)
#             # print(doc_dict)
#             write_doc_dict_to_json.write(out_dir=out_dir, ex_dict=doc_dict)

#         except Exception as e:
#             print("ERROR in parse:", e)
#         finally:
#             if should_delete:
#                 os.remove(f_name)


def parse(
    f_name,
    meta_data=None,
    num_ocr_threads=2,
    force_ocr=True,
    ocr_missing_doc=False,
    out_dir="./"):

    print("running data ingest on: ", f_name)
    file_extension = pathlib.Path(f_name).suffix
    print(file_extension)

    if file_extension == '.pdf':
        try:
            f_name = ocr.get_ocr_filename(f_name, force_ocr=True)
            
            meta_dict = read_meta.read_metadata(meta_data)
            doc_dict = init_doc.create_doc_dict_with_meta(meta_dict)

            init_doc.assign_f_name_fields(f_name, doc_dict)
            init_doc.assign_other_fields(doc_dict)
            should_delete = False
                
            funcs = [ref_list.add_ref_list, entities.extract_entities, topics.extract_topics, keywords.add_keyw_5, abbreviations.add_abbreviations_n, summary.add_summary, add_pagerank_r, add_popscore_r, add_orgs_rs,
                    add_kw_doc_score_r, add_txt_length, text_length.add_word_count]
            text = ""
            with open(f_name, 'rb') as f:
                parser = PDFParser(f)
                doc = PDFDocument(parser)
                pdf_pages = list(PDFPage.create_pages(doc))
                for pdf_page in pdf_pages:
                    rsrcmgr = PDFResourceManager()
                    device = PDFPageAggregator(rsrcmgr, laparams=LAParams())
                    interpreter = PDFPageInterpreter(rsrcmgr, device)
                    interpreter.process_page(pdf_page)
                    layout = device.get_result()
                    
                    for obj in layout:
                        if isinstance(obj, LTTextBox):
                            text += obj.get_text()

            doc_dict["filename"] = f_name
            doc_dict["filename_clean"] = f_name.split('/')[-1]
            doc_dict["doc_num"] = f_name.split('/')[-1]
            doc_dict["TEXT"] = text
            doc_dict["doc_type"] = "ODNI Reports & Publications"
            doc_dict["doc_date"] = "2022"

            pages.handle_pages(None, doc_dict) #RELIES ON PRESENCE OF 'TEXT'
            paragraphs.handle_paragraphs(doc_dict) ####UPDATE PARSER TO INCORPORATE ALL DATA
            
            #REMOVE NONSENSICAL PARAGRAPHS
            clean_text = ''
            for paragraph_data in doc_dict['paragraphs']:
                paragraph_text = paragraph_data['par_raw_text_t']
                paragraph_text_split = re.sub(r'[^a-z]', r' ', paragraph_text.lower()).split(' ')
                paragraph_text_split = list(set([i for i in paragraph_text_split if len(i)>=2]))
                if len(paragraph_text_split)>2:
                    clean_text = '{txt}{par}\n\n'.format(txt=clean_text, par=paragraph_text)

            # print(clean_text)
            doc_dict["TEXT"] = clean_text
            
            doc_dict['keyw_5'] = [extract_keywords.get_keywords(doc_dict["TEXT"])]

            doc_dict = post_process.process(doc_dict)
            write_doc_dict_to_json.write(out_dir=out_dir, ex_dict=doc_dict)

        except Exception as e:
            print("ERROR in parse:", e)

    elif file_extension=='.json':
        for count,line in enumerate(open(str(f_name), 'r', encoding='utf-8-sig')):
            row = json.loads(line)
            
            doc_dict = {}
            print("running policy_analyics.parse on", f_name)
            meta_dict = read_meta.read_metadata(meta_data)
            doc_dict = init_doc.create_doc_dict_with_meta(meta_dict)

            init_doc.assign_f_name_fields(f_name, doc_dict)
            init_doc.assign_other_fields(doc_dict)
            should_delete = False
            
            funcs = [ref_list.add_ref_list, entities.extract_entities, topics.extract_topics, keywords.add_keyw_5, abbreviations.add_abbreviations_n, summary.add_summary, add_pagerank_r, add_popscore_r, add_orgs_rs,
                    add_kw_doc_score_r, add_txt_length, text_length.add_word_count]
            try:
                doc_dict["TEXT"] = row["content"] #WAS "TEXT"
                

                pages.handle_pages(None, doc_dict)
                
                paragraphs.handle_paragraphs(doc_dict) ####UPDATE PARSER TO INCORPORATE ALL DATA

                doc_dict["filename"] = row["title"]+'.json'
                doc_dict["filename_clean"] = row["title"]+'.json'
                doc_dict["doc_num"] = str(count)+'.json'

                doc_dict["doc_type"] = "Tearline.mil"
                doc_dict["doc_date"] = "2022"

                doc_dict['keyw_5'] = [extract_keywords.get_keywords(doc_dict["TEXT"])]

                doc_dict = post_process.process(doc_dict)

                write_doc_dict_to_json.write(out_dir=out_dir, ex_dict=doc_dict)

            except Exception as e:
                print("ERROR in parse:", e)
            finally:
                if should_delete:
                    os.remove(f_name)
